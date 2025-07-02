import { Body, Controller, Get, Post } from '@nestjs/common'
import { TetherService } from './tether.service'

@Controller('tether')
export class TetherController {
  constructor(private readonly tetherService: TetherService) {}

  @Get('health-check')
  async healthCheck() {
    try {
      const result = await this.tetherService.healthCheck()
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Get('current-ip')
  getCurrentIp() {
    try {
      const result = this.tetherService.getCurrentIp()
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Post('reset-tethering')
  async resetTethering() {
    try {
      await this.tetherService.resetUsbTethering()
      return {
        success: true,
        message: '테더링 리셋 완료',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Post('change-ip')
  async changeIp(@Body() body: { prevIp: string }) {
    try {
      const result = await this.tetherService.checkIpChanged({ ip: body.prevIp })
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}
