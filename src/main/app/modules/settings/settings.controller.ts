import { PrismaService } from '@main/app/shared/prisma.service'
import { SettingsService } from '@main/app/shared/settings.service'
import { Body, Controller, Get, Logger, Post, Put } from '@nestjs/common'

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  async getSettings() {
    try {
      this.logger.log('설정 조회 요청')
      const settings = await this.settingsService.getGlobalEngineSettings()
      return { success: true, data: settings }
    }
    catch (error) {
      this.logger.error('설정 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Put()
  async updateSettings(@Body() updateData: any) {
    try {
      this.logger.log('설정 업데이트 요청:', updateData)

      const currentSettings = await this.settingsService.getGlobalEngineSettings()
      const updatedSettings = { ...currentSettings, ...updateData }

      await (this.prisma as any).settings.upsert({
        where: { id: 2 },
        create: {
          id: 2,
          data: JSON.stringify(updatedSettings),
        },
        update: {
          data: JSON.stringify(updatedSettings),
        },
      })

      this.logger.log('설정 업데이트 완료')
      return { success: true, data: updatedSettings }
    }
    catch (error) {
      this.logger.error('설정 업데이트 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Get('status')
  async getAppStatus() {
    try {
      this.logger.log('앱 상태 조회 요청')
      const status = await this.settingsService.getAppStatus()
      return { success: true, data: status }
    }
    catch (error) {
      this.logger.error('앱 상태 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Get('instagram')
  async getInstagramSettings() {
    try {
      const setting = await this.settingsService.findByKey('instagram')
      return { success: true, data: setting?.data || {} }
    }
    catch (error) {
      this.logger.error('인스타그램 설정 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Post('instagram')
  async saveInstagramSettings(@Body() data: any) {
    try {
      await this.settingsService.saveByKey('instagram', data)
      return { success: true }
    }
    catch (error) {
      this.logger.error('인스타그램 설정 저장 실패:', error)
      return { success: false, error: error.message }
    }
  }
}
