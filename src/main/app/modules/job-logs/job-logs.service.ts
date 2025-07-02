import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class JobLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobLogs(jobId: string) {
    return this.prisma.log.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getLatestJobLog(jobId: string) {
    return this.prisma.log.findFirst({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createJobLog(jobId: string, message: string) {
    return this.prisma.log.create({
      data: {
        jobId,
        message,
      },
    })
  }

  async deleteJobLogsByJobId(jobId: string) {
    return this.prisma.log.deleteMany({
      where: { jobId },
    })
  }
}
