import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WorkflowService } from './workflow.service'

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
