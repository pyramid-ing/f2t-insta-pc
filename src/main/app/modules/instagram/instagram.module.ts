import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { WorkflowModule } from '../workflow/workflow.module'
import { InstagramWorkflowController } from './workflow/instagram-workflow.controller'

@Module({
  imports: [SettingsModule, WorkflowModule],
  controllers: [InstagramWorkflowController],
  providers: [],
  exports: [],
})
export class InstagramModule {}
