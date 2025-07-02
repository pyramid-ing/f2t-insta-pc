import { sleep } from '@main/app/utils/sleep'
import { Injectable, Logger } from '@nestjs/common'
import { PostJob } from '@prisma/client'
import _ from 'lodash'
import { PrismaService } from '../common/prisma/prisma.service'
import { JobLogsService } from '../job-logs/job-logs.service'
import { SettingsService } from '../settings/settings.service'
import { CookieService } from '../util/cookie.service'

@Injectable()
export class PostJobService {
  private readonly logger = new Logger(PostJobService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jobLogsService: JobLogsService,
    private readonly settingsService: SettingsService,
    private readonly cookieService: CookieService,
  ) {}

  // 예약 작업 목록 조회 (최신 업데이트가 위로 오게 정렬) - 최신 로그 포함
  async getPostJobs(options?: { status?: string; search?: string; orderBy?: string; order?: 'asc' | 'desc' }) {
    const where: any = {}

    // 상태 필터
    if (options?.status) {
      where.status = options.status
    }

    // 검색 필터 (제목, 갤러리URL, 말머리에서 검색)
    if (options?.search) {
      where.OR = [
        { subject: { contains: options.search } },
        { desc: { contains: options.search } },
        { resultMsg: { contains: options.search } },
      ]
    }

    // 정렬 설정
    const orderBy: any = {}
    const sortField = options?.orderBy || 'updatedAt'
    const sortOrder = options?.order || 'desc'
    orderBy[sortField] = sortOrder

    const postJobs = await this.prismaService.postJob.findMany({
      where,
      orderBy,
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return postJobs.map(job => ({
      ...job,
      latestLog: job.logs[0] || null,
      logs: undefined, // 리스트에서는 logs 배열을 제거하고 latestLog만 포함
    }))
  }

  // 특정 작업과 모든 로그 조회
  async getPostJobWithLogs(id: string) {
    const postJob = await this.prismaService.postJob.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!postJob) {
      throw new Error('작업을 찾을 수 없습니다.')
    }

    return postJob
  }

  // 예약 작업 상태/결과 갱신
  async updateStatus(id: string, status: string, resultMsg?: string) {
    return this.prismaService.postJob.update({
      where: { id },
      data: { status, resultMsg },
    })
  }

  // 예약 작업 상태/결과/URL 갱신 (포스팅 완료 시 사용)
  async updateStatusWithUrl(id: string, status: string, resultMsg?: string, resultUrl?: string) {
    const updateData: any = { status, resultMsg }
    if (resultUrl) {
      updateData.resultUrl = resultUrl
    }
    if (status === 'completed') {
      updateData.postedAt = new Date()
    }

    return this.prismaService.postJob.update({
      where: { id },
      data: updateData,
    })
  }

  // 특정 상태인 작업들 조회
  async findByStatus(status: string) {
    return this.prismaService.postJob.findMany({
      where: { status },
      orderBy: { scheduledAt: 'asc' },
    })
  }

  // 실패한 작업 재시도 (상태를 pending으로 변경)
  async retryPostJob(id: string) {
    const job = await this.prismaService.postJob.findUnique({ where: { id } })

    if (!job) {
      return { success: false, message: '작업을 찾을 수 없습니다.' }
    }

    if (job.status !== 'failed') {
      return { success: false, message: '실패한 작업만 재시도할 수 있습니다.' }
    }

    await this.prismaService.postJob.update({
      where: { id },
      data: {
        status: 'pending',
        resultMsg: null,
        resultUrl: null,
      },
    })

    await this.jobLogsService.createJobLog(id, '작업 재시도 요청')

    return { success: true, message: '재시도 요청이 완료되었습니다.' }
  }

  // 작업 삭제
  async deletePostJob(id: string) {
    const job = await this.prismaService.postJob.findUnique({ where: { id } })

    if (!job) {
      return { success: false, message: '작업을 찾을 수 없습니다.' }
    }

    if (job.status === 'processing') {
      return { success: false, message: '실행 중인 작업은 삭제할 수 없습니다.' }
    }

    // 관련 로그들도 함께 삭제 (Cascade 설정으로 자동 삭제됨)
    await this.prismaService.postJob.delete({ where: { id } })

    return { success: true, message: '작업이 삭제되었습니다.' }
  }

  async processPostJobs(): Promise<void> {
    const postJobs = await this.prismaService.postJob.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lte: new Date(),
        },
      },
    })

    if (postJobs.length === 0) {
      return
    }

    await this.prismaService.postJob.updateMany({
      where: {
        id: {
          in: postJobs.map(postJob => postJob.id),
        },
      },
      data: {
        status: 'processing',
      },
    })

    const globalSettings = await this.settingsService.getGlobalSettings()
    const groupedPostJobs = _.groupBy(postJobs, postJob => postJob.loginId)

    for (const loginId in groupedPostJobs) {
      const postJobsForLogin = groupedPostJobs[loginId]

      try {
        for (const postJob of postJobsForLogin) {
          await this.handlePostJob(postJob)

          // 작업 간 딜레이
          if (postJobsForLogin.length > 1) {
            this.logger.log(`작업 간 딜레이: ${0}초`)
            await sleep(0 * 1000)
          }
        }
      } catch (error) {
        this.logger.error(`로그인 그룹 ${loginId} 작업 처리 중 오류:`, error)

        // 해당 그룹의 모든 작업을 실패로 처리
        await this.prismaService.postJob.updateMany({
          where: {
            id: {
              in: postJobsForLogin.map(postJob => postJob.id),
            },
          },
          data: {
            status: 'failed',
            resultMsg: error.message,
          },
        })

        // 각 작업에 로그 추가
        for (const postJob of postJobsForLogin) {
          await this.jobLogsService.createJobLog(postJob.id, `작업 실패: ${error.message}`)
        }
      }
    }
  }

  /**
   * 개별 작업 처리
   */
  async handlePostJob(postJob: PostJob) {
    try {
      this.logger.log(`작업 시작: ID ${postJob.id}`)
      await this.jobLogsService.createJobLog(postJob.id, '작업 시작')

      // 여기서 실제 포스팅 로직을 구현
      // 현재는 임시로 성공 처리
      await this.jobLogsService.createJobLog(postJob.id, '포스팅 처리 중...')

      // 임시 딜레이 (실제 작업 시뮬레이션)
      await sleep(2000)

      await this.updateStatusWithUrl(postJob.id, 'completed', '포스팅 완료', 'https://example.com/post/123')
      await this.jobLogsService.createJobLog(postJob.id, '포스팅 완료')

      this.logger.log(`작업 완료: ID ${postJob.id}`)
    } catch (error) {
      await this.updateStatus(postJob.id, 'failed', error.message)
      await this.jobLogsService.createJobLog(postJob.id, `작업 실패: ${error.message}`)
      this.logger.error(`작업 실패: ID ${postJob.id} - ${error.message}`)
    }
  }
}
