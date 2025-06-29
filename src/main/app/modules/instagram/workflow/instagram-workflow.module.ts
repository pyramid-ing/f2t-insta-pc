import { InstagramApiModule } from '@main/app/modules/instagram/api/instagram-api.module'
import { Module } from '@nestjs/common'
import { SettingsModule } from 'src/main/app/modules/settings/settings.module'
import { InstagramWorkflowController } from './instagram-workflow.controller'

@Module({
  imports: [InstagramApiModule, SettingsModule],
  controllers: [InstagramWorkflowController],
  providers: [],
})
export class InstagramWorkflowModule {}
