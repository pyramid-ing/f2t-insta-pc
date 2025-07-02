import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { execSync } from 'child_process'
import { sleep } from '../../utils/sleep'

@Injectable()
export class TetherService {
  private readonly logger = new Logger(TetherService.name)

  async getCurrentIp(): Promise<{ ip: string }> {
    try {
      const response = await axios.get('https://ifconfig.co/ip', {
        timeout: 5000,
      })
      const ip = response.data.toString().trim()

      if (ip && this.isValidIp(ip)) {
        return { ip }
      }
    } catch (e) {
      this.logger.error('[IP체크] IP 조회 실패:', e.message)
      return { ip: '' }
    }
  }

  private isValidIp(ip: string): boolean {
    // IPv4 또는 IPv6 패턴 간단 검증
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip)
  }

  async resetUsbTethering(): Promise<void> {
    try {
      this.logger.log('[ADB] USB 테더링 OFF')
      execSync('adb shell svc data disable', { timeout: 5000 })
      await sleep(2000)

      this.logger.log('[ADB] USB 테더링 ON')
      execSync('adb shell svc data enable', { timeout: 5000 })
      await sleep(5000)
    } catch (e) {
      this.logger.error('[ADB] 테더링 리셋 실패:', e.message)
      throw new Error(`테더링 리셋 실패: ${e.message}`)
    }
  }

  async checkIpChanged(prevIp: { ip: string }): Promise<{ ip: string }> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.resetUsbTethering()
        const newIp = await this.getCurrentIp()

        this.logger.log(`[IP체크] 이전: ${prevIp.ip} / 새로고침: ${newIp.ip}`)

        if (newIp.ip && newIp.ip !== prevIp.ip) {
          this.logger.log(`[IP체크] IP 변경 성공: ${prevIp.ip} → ${newIp.ip}`)
          return newIp
        }

        if (attempt < 3) {
          this.logger.warn(`[IP체크] IP 변경 실패, ${attempt}회 재시도...`)
          await sleep(3000)
        }
      } catch (e) {
        this.logger.error(`[IP체크] ${attempt}회 시도 실패:`, e.message)
        if (attempt === 3) {
          throw e
        }
      }
    }

    throw new Error('3회 시도에도 IP가 변경되지 않았습니다. 중단합니다.')
  }

  async checkAndroidConnection(): Promise<{ connected: boolean; devices: string[] }> {
    try {
      const result = execSync('adb devices', { timeout: 5000 }).toString()
      const lines = result.split('\n').filter(line => line.trim() && !line.includes('List of devices'))
      const devices = lines.map(line => line.split('\t')[0]).filter(device => device.trim())

      this.logger.log(`[ADB] 연결된 기기: ${devices.length}개`)
      return {
        connected: devices.length > 0,
        devices,
      }
    } catch (e) {
      this.logger.error('[ADB] 기기 연결 확인 실패:', e.message)
      return {
        connected: false,
        devices: [],
      }
    }
  }

  async healthCheck(): Promise<{
    adbConnected: boolean
    currentIp: string
    devices: string[]
  }> {
    const androidConnection = await this.checkAndroidConnection()
    const currentIp = await this.getCurrentIp()

    return {
      adbConnected: androidConnection.connected,
      currentIp: currentIp.ip,
      devices: androidConnection.devices,
    }
  }
}
