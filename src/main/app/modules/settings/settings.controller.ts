import { Body, Controller, Get, Logger, Post } from '@nestjs/common'
import { SettingsService } from 'src/main/app/modules/settings/settings.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { GlobalSettingsDto } from './dto/global-settings.dto'

@Controller('/settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('/global')
  async getGlobalSettingsEndpoint() {
    try {
      const settings = await this.settingsService.getGlobalSettings()
      return { success: true, data: settings }
    } catch (error) {
      this.logger.error('글로벌 설정 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Post('/global')
  async saveGlobalSettingsEndpoint(@Body() data: GlobalSettingsDto) {
    try {
      await this.settingsService.saveGlobalSettings(data)
      return { success: true }
    } catch (error) {
      this.logger.error('글로벌 설정 저장 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Post('/validate-openai-key')
  async validateOpenAIKey(@Body() body: { apiKey: string }) {
    return this.settingsService.validateOpenAIKey(body.apiKey)
  }
}
