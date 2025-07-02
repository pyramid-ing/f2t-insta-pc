import { InstagramApiModule } from '@main/app/modules/instagram/api/instagram-api.module'
import { PostJobModule } from '@main/app/modules/instagram/post-job/post-job.module'
import { UtilModule } from '@main/app/modules/util/util.module'
import { Module } from '@nestjs/common'
import { SettingsModule } from 'src/main/app/modules/settings/settings.module'
import { InstagramWorkflowController } from './instagram-workflow.controller'

@Module({
  imports: [InstagramApiModule, SettingsModule, UtilModule, PostJobModule],
  controllers: [InstagramWorkflowController],
  providers: [],
})
export class InstagramWorkflowModule {}
