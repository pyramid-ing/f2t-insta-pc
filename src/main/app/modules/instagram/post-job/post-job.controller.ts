import { Controller, Delete, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { PostJobService } from 'src/main/app/modules/instagram/post-job/post-job.service'

@Controller('post-jobs')
export class PostJobController {
  constructor(private readonly postJobService: PostJobService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.postJobService.getPostJobs({
      status,
      search,
      orderBy: orderBy || 'updatedAt',
      order: order || 'desc',
    })
  }

  @Post('dm/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDmExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('엑셀 파일이 필요합니다.')
    }

    return this.postJobService.createDmJobsFromExcel(file.buffer)
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    return this.postJobService.retryPostJob(id)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.postJobService.getPostJobWithLogs(id)
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.postJobService.deletePostJob(id)
  }
}
