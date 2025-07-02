import { Controller, Get, Param } from '@nestjs/common'
import { JobLogsService } from 'src/main/app/modules/instagram/job-logs/job-logs.service'

@Controller('/logs')
export class JobLogsController {
  constructor(private readonly jobLogsService: JobLogsService) {}

  @Get('/:jobId')
  async getLogs(@Param('jobId') jobId: string) {
    return {
      logs: await this.jobLogsService.getJobLogs(jobId),
    }
  }

  @Get('/:jobId/latest')
  async getLatestLog(@Param('jobId') jobId: string) {
    return {
      log: await this.jobLogsService.getLatestJobLog(jobId),
    }
  }
}
