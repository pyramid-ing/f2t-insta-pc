import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { SettingsModule } from '../../settings/settings.module'
import { TetherModule } from '../../tether/tether.module'
import { UtilModule } from '../../util/util.module'
import { InstagramApiModule } from '../api/instagram-api.module'
import { JobLogsModule } from '../job-logs/job-logs.module'
import { PostJobController } from './post-job.controller'
import { PostJobProcessor } from './post-job.processor'
import { PostJobService } from './post-job.service'

@Module({
  imports: [CommonModule, JobLogsModule, SettingsModule, TetherModule, UtilModule, InstagramApiModule],
  controllers: [PostJobController],
  providers: [PostJobService, PostJobProcessor],
  exports: [PostJobService],
})
export class PostJobModule {}
