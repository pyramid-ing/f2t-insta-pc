import { PostJobService } from '@main/app/modules/instagram/post-job/post-job.service'
import { WorkflowExportXlsxDto } from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

@Controller()
export class InstagramWorkflowController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly postJobService: PostJobService,
  ) {}

  @Post('export-sample-xlsx')
  async exportSampleXlsx(@Res() res: Response) {
    // 샘플 데이터 생성
    const sampleRows = [
      {
        유저명: '홍길동',
        유저ID: 'hong_gildong',
        '프로필 링크': 'https://instagram.com/hong_gildong',
        DM: '안녕하세요! 제품에 관심이 있으시면 연락주세요.',
      },
      {
        유저명: '김철수',
        유저ID: 'kim_chulsoo',
        '프로필 링크': 'https://instagram.com/kim_chulsoo',
        DM: '좋은 하루 되세요!',
      },
      {
        유저명: '이영희',
        유저ID: 'lee_younghee',
        '프로필 링크': 'https://instagram.com/lee_younghee',
        DM: '팔로우 감사합니다.',
      },
      {
        유저명: '박민수',
        유저ID: 'park_minsoo',
        '프로필 링크': 'https://instagram.com/park_minsoo',
        DM: '',
      },
      {
        유저명: '최지은',
        유저ID: 'choi_jieun',
        '프로필 링크': 'https://instagram.com/choi_jieun',
        DM: '새로운 소식이 있으면 공유드릴게요!',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: ['유저명', '유저ID', '프로필 링크', 'DM'] })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="sample_dm_template.xlsx"')
    res.send(buffer)
  }

  @Post('create-export-job')
  async createExportJob(@Body() dto: WorkflowExportXlsxDto) {
    const result = await this.postJobService.createExportJob({
      keyword: dto.keyword,
      limit: dto.limit,
      orderBy: dto.orderBy,
    })
    return result
  }

  @Get('download-export/:jobId')
  async downloadExportFile(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = await this.postJobService.getPostJobWithLogs(jobId)

    if (!job) {
      throw new HttpException('작업을 찾을 수 없습니다.', HttpStatus.NOT_FOUND)
    }

    if (job.type !== 'export') {
      throw new HttpException('엑셀 추출 작업이 아닙니다.', HttpStatus.BAD_REQUEST)
    }

    if (job.status !== 'completed') {
      throw new HttpException('작업이 완료되지 않았습니다.', HttpStatus.BAD_REQUEST)
    }

    if (!job.resultFilePath || !fs.existsSync(job.resultFilePath)) {
      throw new HttpException('파일을 찾을 수 없습니다.', HttpStatus.NOT_FOUND)
    }

    const fileName = path.basename(job.resultFilePath)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    const fileStream = fs.createReadStream(job.resultFilePath)
    fileStream.pipe(res)
  }
}
