import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { JobLogsController } from './job-logs.controller'
import { JobLogsService } from './job-logs.service'

@Module({
  imports: [CommonModule],
  controllers: [JobLogsController],
  providers: [JobLogsService],
  exports: [JobLogsService],
})
export class JobLogsModule {}
