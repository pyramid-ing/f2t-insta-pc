import { InstagramApiModule } from '@main/app/modules/instagram/api/instagram-api.module'
import { Module } from '@nestjs/common'
import { InstagramWorkflowController } from './instagram-workflow.controller'

@Module({
  imports: [InstagramApiModule],
  controllers: [InstagramWorkflowController],
  providers: [],
})
export class InstagramWorkflowModule {}
