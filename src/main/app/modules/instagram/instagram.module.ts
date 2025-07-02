import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { InstagramApiModule } from './api/instagram-api.module'
import { JobLogsModule } from './job-logs/job-logs.module'
import { PostJobModule } from './post-job/post-job.module'
import { InstagramWorkflowModule } from './workflow/instagram-workflow.module'

@Module({
  imports: [
    InstagramApiModule,
    InstagramWorkflowModule,
    JobLogsModule,
    PostJobModule,
    RouterModule.register([
      {
        path: 'instagram',
        children: [
          { path: 'api', module: InstagramApiModule },
          { path: 'workflow', module: InstagramWorkflowModule },
        ],
      },
    ]),
  ],
  exports: [InstagramApiModule, InstagramWorkflowModule, JobLogsModule, PostJobModule],
})
export class InstagramModule {}
