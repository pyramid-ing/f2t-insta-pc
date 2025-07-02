import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { JobLogsModule } from '../job-logs/job-logs.module'
import { SettingsModule } from '../settings/settings.module'
import { UtilModule } from '../util/util.module'
import { PostJobController } from './post-job.controller'
import { PostJobProcessor } from './post-job.processor'
import { PostJobService } from './post-job.service'

@Module({
  imports: [CommonModule, JobLogsModule, SettingsModule, UtilModule],
  controllers: [PostJobController],
  providers: [PostJobService, PostJobProcessor],
  exports: [PostJobService],
})
export class PostJobModule {}
