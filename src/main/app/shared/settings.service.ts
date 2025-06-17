import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/main/app/shared/prisma.service'

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(private readonly prisma: PrismaService) {}

  // 전역 엔진 설정 조회
  async getGlobalEngineSettings() {
    try {
      const settings = await (this.prisma as any).settings.findFirst({ where: { id: 2 } })
      if (!settings) {
        // 기본 전역 설정 생성
        const defaultGlobalSettings = {
          google: {
            use: false,
            serviceAccountEmail: '',
            privateKey: '',
            oauth2ClientId: '',
            oauth2ClientSecret: '',
            oauth2AccessToken: '',
            oauth2RefreshToken: '',
            oauth2TokenExpiry: '',
          },
          bing: { use: false, apiKey: '' },
          naver: { use: false, naverId: '', password: '', headless: true },
          daum: { use: false, siteUrl: '', password: '', headless: true },
        }

        await (this.prisma as any).settings.create({
          data: {
            id: 2,
            data: JSON.stringify(defaultGlobalSettings),
          },
        })

        return defaultGlobalSettings
      }

      return JSON.parse(settings.data)
    }
    catch (error) {
      this.logger.error('전역 엔진 설정 조회 실패:', error)
      throw error
    }
  }

  // 앱 상태 조회
  async getAppStatus() {
    try {
      const settings = await (this.prisma as any).settings.findFirst({ where: { id: 1 } })
      if (!settings) {
        const defaultSettings = {
          appVersion: '1.0.0',
          initialized: true,
          setupCompleted: false,
          theme: 'light',
          language: 'ko',
        }

        await (this.prisma as any).settings.create({
          data: {
            id: 1,
            data: JSON.stringify(defaultSettings),
          },
        })

        return defaultSettings
      }

      return JSON.parse(settings.data)
    }
    catch (error) {
      this.logger.error('앱 상태 조회 실패:', error)
      throw error
    }
  }

  // key로 조회
  async findByKey(key: string) {
    return this.prisma.settings.findFirst({ where: { id: this.keyToId(key) } })
  }

  // key로 저장 (upsert)
  async saveByKey(key: string, data: any) {
    return this.prisma.settings.upsert({
      where: { id: this.keyToId(key) },
      update: { data },
      create: { id: this.keyToId(key), data },
    })
  }

  // key를 id로 변환 (간단 매핑, 실제 운영시 key 컬럼 추가 권장)
  private keyToId(key: string): number {
    // 예시: 'instagram' -> 100, 필요시 매핑 확장
    if (key === 'instagram')
      return 100
    if (key === 'global')
      return 2
    if (key === 'app')
      return 1
    return 9999 // 기타
  }
}
