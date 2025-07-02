import { PostJobService } from '@main/app/modules/instagram/post-job/post-job.service'
import { WorkflowExportXlsxDto } from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'
import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Res } from '@nestjs/common'
import { Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'

@Controller()
export class InstagramWorkflowController {
  constructor(private readonly postJobService: PostJobService) {}

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
    const asciiFallback = 'export.xlsx'

    // URL-encoded UTF-8 문자열
    const encodedFileName = encodeURIComponent(fileName).replace(/'/g, '%27')

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`)

    const fileStream = fs.createReadStream(job.resultFilePath)
    fileStream.pipe(res)
  }
}
