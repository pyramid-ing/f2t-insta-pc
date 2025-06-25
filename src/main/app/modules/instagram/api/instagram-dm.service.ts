import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IgApiClient } from 'instagram-private-api'
import { InstagramLoginService } from './instagram-login.service'
import { InstagramActionResponse } from './interfaces/instagram.interface'

// DM 파라미터 타입 정의
export interface SendDmParams {
  username: string
  message: string
  loginUsername?: string
  headless?: boolean
}

@Injectable()
export class InstagramDmService {
  constructor(
    protected readonly configService: ConfigService,
    private readonly loginService: InstagramLoginService,
  ) {}

  async sendDm(ig: import('instagram-private-api').IgApiClient, params: SendDmParams): Promise<InstagramActionResponse> {
    const { username, message } = params
    try {
      // 세션 불러오기 (loginService 활용)
      if (!(await this.loginService.loadSession(params.loginUsername || 'instagram'))) {
        return { success: false, error: '로그인이 필요합니다.' }
      }
      // 대상 유저 정보 조회
      const userResult = await ig.user.searchExact(username)
      if (!userResult) {
        return { success: false, error: '사용자를 찾을 수 없습니다.' }
      }
      const userId = userResult.pk
      // DM 전송
      const thread = ig.entity.directThread([userId.toString()])
      await thread.broadcastText(message)
      return { success: true }
    }
    catch (error) {
      return { success: false, error: error.message }
    }
  }
}
