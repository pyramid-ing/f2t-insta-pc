import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { OpenAI } from 'openai'

export interface GlobalSettings {
  taskDelay?: number
  showBrowserWindow?: boolean
  minDelay?: number
  maxDelay?: number
  loginId?: string
  loginPassword?: string
  useTethering?: boolean
  tetherInterface?: string
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(private readonly prisma: PrismaService) {}

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
  // OpenAI API 키 검증
  async validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string; model?: string }> {
    try {
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return { valid: false, error: 'API 키가 비어있습니다.' }
      }

      const openai = new OpenAI({ apiKey: apiKey.trim() })

      // 간단한 모델 목록 조회로 API 키 유효성 검증
      const models = await openai.models.list()

      // GPT 모델이 있는지 확인
      const gptModels = models.data.filter(model => model.id.includes('gpt') || model.id.includes('o1'))

      if (gptModels.length === 0) {
        return { valid: false, error: 'GPT 모델에 접근할 수 없습니다.' }
      }

      // 사용 가능한 첫 번째 GPT 모델 반환
      const availableModel =
        gptModels.find(m => m.id.includes('gpt-4') || m.id.includes('gpt-3.5') || m.id.includes('o1'))?.id ||
        gptModels[0].id

      return {
        valid: true,
        model: availableModel,
      }
    } catch (error) {
      this.logger.error('OpenAI API 키 검증 실패:', error)

      if (error.status === 401) {
        return { valid: false, error: '유효하지 않은 API 키입니다.' }
      } else if (error.status === 429) {
        return { valid: false, error: 'API 사용량 한도를 초과했습니다.' }
      } else if (error.status === 403) {
        return { valid: false, error: 'API 키에 필요한 권한이 없습니다.' }
      } else {
        return { valid: false, error: `API 키 검증 실패: ${error.message}` }
      }
    }
  }

  // 글로벌 설정 조회 (타입 안전)
  async getGlobalSettings(): Promise<GlobalSettings> {
    const setting = await this.findByKey('global')
    const data = setting.data as GlobalSettings

    return {
      taskDelay: data.taskDelay,
      showBrowserWindow: data.showBrowserWindow || false,
      minDelay: data.minDelay || 1000,
      maxDelay: data.maxDelay || 10000,
      loginId: data.loginId || '',
      loginPassword: data.loginPassword || '',
      useTethering: data.useTethering || false,
      tetherInterface: data.tetherInterface || 'enp0s20u2',
    }
  }

  // 글로벌 설정 저장 (타입 안전)
  async saveGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    const currentSettings = await this.getGlobalSettings()
    const updatedSettings = { ...currentSettings, ...settings }
    await this.saveByKey('global', updatedSettings)
  }

  // key를 id로 변환 (간단 매핑, 실제 운영시 key 컬럼 추가 권장)
  private keyToId(key: string): number {
    if (key === 'global') return 2
    return 9999 // 기타
  }
}
