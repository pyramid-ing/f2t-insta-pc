import { SettingsService } from '@main/app/modules/settings/settings.service'
import { PrismaService } from '@main/app/shared/prisma.service'
import { Body, Controller, Get, Logger, Post } from '@nestjs/common'

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('instagram')
  async getInstagramSettings() {
    try {
      const setting = await this.settingsService.findByKey('instagram')
      return { success: true, data: setting?.data || {} }
    } catch (error) {
      this.logger.error('인스타그램 설정 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Post('instagram')
  async saveInstagramSettings(@Body() data: any) {
    try {
      await this.settingsService.saveByKey('instagram', data)
      return { success: true }
    } catch (error) {
      this.logger.error('인스타그램 설정 저장 실패:', error)
      return { success: false, error: error.message }
    }
  }
}
