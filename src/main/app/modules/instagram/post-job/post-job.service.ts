import { sleep } from '@main/app/utils/sleep'
import { Injectable, Logger } from '@nestjs/common'
import { PostJob } from '@prisma/client'
import _ from 'lodash'
import * as XLSX from 'xlsx'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SettingsService } from '../../settings/settings.service'
import { CookieService } from '../../util/cookie.service'
import { InstagramApi } from '../api/instagram-api'
import { JobLogsService } from '../job-logs/job-logs.service'

@Injectable()
export class PostJobService {
  private readonly logger = new Logger(PostJobService.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jobLogsService: JobLogsService,
    private readonly settingsService: SettingsService,
    private readonly cookieService: CookieService,
    private readonly instagramApi: InstagramApi,
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
            this.logger.log(`작업 간 딜레이: ${globalSettings.taskDelay}초`)
            await sleep(globalSettings.taskDelay * 1000)
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
      this.logger.log(`작업 시작: ID ${postJob.id}, Type: ${postJob.type}`)
      await this.jobLogsService.createJobLog(postJob.id, '작업 시작')

      if (postJob.type === 'dm') {
        await this.handleDmJob(postJob)
      } else {
        // 기존 포스팅 로직 (미구현)
        await this.jobLogsService.createJobLog(postJob.id, '포스팅 처리 중...')
        await sleep(2000)
        await this.updateStatusWithUrl(postJob.id, 'completed', '포스팅 완료', 'https://example.com/post/123')
        await this.jobLogsService.createJobLog(postJob.id, '포스팅 완료')
      }

      this.logger.log(`작업 완료: ID ${postJob.id}`)
    } catch (error) {
      await this.updateStatus(postJob.id, 'failed', error.message)
      await this.jobLogsService.createJobLog(postJob.id, `작업 실패: ${error.message}`)
      this.logger.error(`작업 실패: ID ${postJob.id} - ${error.message}`)
    }
  }

  /**
   * DM 전송 작업 처리
   */
  private async handleDmJob(postJob: PostJob) {
    if (!postJob.targetUsers) {
      throw new Error('대상 유저 정보가 없습니다.')
    }

    const targetUsers = JSON.parse(postJob.targetUsers)

    // 인스타그램 로그인
    await this.jobLogsService.createJobLog(postJob.id, '인스타그램 로그인 중...')
    await this.instagramApi.login(postJob.loginId, postJob.loginPw)
    await this.jobLogsService.createJobLog(postJob.id, '인스타그램 로그인 완료')

    const results = []
    let successCount = 0
    let failCount = 0

    // 각 유저에게 DM 전송
    for (const user of targetUsers) {
      try {
        await this.jobLogsService.createJobLog(postJob.id, `${user.유저ID}에게 DM 전송 중...`)

        const dmResult = await this.instagramApi.sendDm(user.유저ID, user.DM)
        successCount++

        await this.jobLogsService.createJobLog(postJob.id, `${user.유저ID}에게 DM 전송 성공`)
        results.push({ userId: user.유저ID, success: true, message: 'DM 전송 성공' })

        // 사용자 간 딜레이 (5-10초 랜덤)
        const delay = 5000 + Math.random() * 5000
        await this.jobLogsService.createJobLog(postJob.id, `다음 사용자까지 ${Math.round(delay / 1000)}초 대기`)
        await sleep(delay)
      } catch (error) {
        failCount++
        const errorMsg = error.message || '알 수 없는 오류'
        await this.jobLogsService.createJobLog(postJob.id, `${user.유저ID}에게 DM 전송 실패: ${errorMsg}`)
        results.push({ userId: user.유저ID, success: false, message: errorMsg })
      }
    }

    // 작업 결과 정리
    const resultMessage = `DM 전송 완료 - 성공: ${successCount}명, 실패: ${failCount}명`
    await this.jobLogsService.createJobLog(postJob.id, resultMessage)

    if (failCount === 0) {
      await this.updateStatus(postJob.id, 'completed', resultMessage)
    } else if (successCount === 0) {
      throw new Error(`모든 DM 전송 실패 (${failCount}명)`)
    } else {
      await this.updateStatus(postJob.id, 'completed', `부분 성공 - ${resultMessage}`)
    }
  }

  // DM 전송 작업 생성 (엑셀 파일로부터)
  async createDmJobsFromExcel(file: Buffer, scheduledAt?: Date): Promise<any> {
    const workbook = XLSX.read(file, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)

    if (!rows.length) {
      throw new Error('엑셀 데이터가 비어있습니다.')
    }

    const globalSettings = await this.settingsService.getGlobalSettings()
    if (!globalSettings.loginId || !globalSettings.loginPassword) {
      throw new Error('인스타그램 로그인 정보(아이디/비밀번호)가 필요합니다.')
    }

    // 엑셀 데이터 검증 및 변환
    const targetUsers = []
    let defaultScheduledAt = scheduledAt || new Date()

    for (const row of rows) {
      const { 유저ID, DM, 예약날짜: scheduledDate } = row as any

      if (!유저ID) {
        throw new Error('유저ID가 없는 행이 있습니다.')
      }

      const dmMessage = typeof DM === 'string' ? DM : DM ? String(DM) : ''
      if (!dmMessage.trim()) {
        throw new Error(`${유저ID}의 DM 메시지가 비어있습니다.`)
      }

      // 예약날짜 파싱
      let userScheduledAt = defaultScheduledAt
      if (scheduledDate) {
        const parsedDate = this.parseScheduledDate(scheduledDate)
        if (parsedDate) {
          userScheduledAt = parsedDate
        }
      }

      targetUsers.push({
        유저ID,
        DM: dmMessage,
        scheduledAt: userScheduledAt,
      })
    }

    // 예약 시간별로 그룹화하여 작업 생성
    const groupedBySchedule = _.groupBy(targetUsers, user => user.scheduledAt.toISOString())
    const createdJobs = []

    for (const scheduleTime in groupedBySchedule) {
      const usersForSchedule = groupedBySchedule[scheduleTime]
      const scheduledAtDate = new Date(scheduleTime)

      // 각 예약 시간별로 DM 작업 생성
      const postJob = await this.prismaService.postJob.create({
        data: {
          type: 'dm',
          subject: `DM 전송 (${usersForSchedule.length}명)`,
          desc: `${usersForSchedule.map(u => u.유저ID).join(', ')}에게 DM 전송`,
          targetUsers: JSON.stringify(usersForSchedule),
          loginId: globalSettings.loginId,
          loginPw: globalSettings.loginPassword,
          status: 'pending',
          scheduledAt: scheduledAtDate,
        },
      })

      await this.jobLogsService.createJobLog(postJob.id, `DM 전송 작업 등록 (대상: ${usersForSchedule.length}명)`)
      createdJobs.push(postJob)
    }

    return {
      success: true,
      message: `${createdJobs.length}개의 DM 전송 작업이 등록되었습니다.`,
      jobs: createdJobs,
    }
  }

  // 예약날짜 문자열 파싱
  private parseScheduledDate(dateStr: string): Date | null {
    try {
      // "2025-07-01 01:00" 형식 파싱
      const dateRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/
      const match = dateStr.toString().match(dateRegex)

      if (match) {
        const [, year, month, day, hour, minute] = match
        return new Date(
          parseInt(year),
          parseInt(month) - 1, // 월은 0부터 시작
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
        )
      }

      // 다른 형식도 시도
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime()) && parsed > new Date()) {
        return parsed
      }

      return null
    } catch (error) {
      this.logger.warn(`예약날짜 파싱 실패: ${dateStr}`)
      return null
    }
  }
}
