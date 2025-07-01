import { CookieService } from '@main/app/modules/util/cookie.service'
import { Injectable } from '@nestjs/common'
import { IgApiClient, IgCheckpointError } from 'instagram-private-api'

@Injectable()
export class InstagramApi {
  private ig: IgApiClient

  constructor(private readonly cookieService: CookieService) {
    this.ig = new IgApiClient()
  }

  async saveSession(username: string) {
    const state = await this.ig.state.serialize()
    this.cookieService.saveCookies('instagram', username, state)
  }

  async loadSession(username: string) {
    const savedState = this.cookieService.loadCookies('instagram', username)
    if (savedState) {
      await this.ig.state.deserialize(savedState)
      return true
    }
    return false
  }

  async login(username: string, password: string) {
    try {
      if (await this.loadSession(username)) {
        console.log('세션에서 로그인 정보 불러옴')
        return
      }
      this.ig.state.generateDevice(username)
      await this.ig.simulate.preLoginFlow()
      const loggedInUser = await this.ig.account.login(username, password)
      console.log('로그인 성공:', loggedInUser.username)
      await this.saveSession(username)
      return loggedInUser
    } catch (error) {
      if (error instanceof IgCheckpointError) {
        console.log(this.ig.state.checkpoint)
        await this.ig.challenge.auto(true)
        console.log(this.ig.state.checkpoint)
        return { challengeRequired: true }
      } else {
        console.log('로그인 오류:', error)
        throw error
      }
    }
  }

  async verifyChallenge(username: string, code: string) {
    try {
      const result = await this.ig.challenge.sendSecurityCode(code)
      console.log('챌린지 해결:', result)
      await this.saveSession(username)
      return result
    } catch (error) {
      console.log('챌린지 해결 오류:', error)
      throw error
    }
  }

  async sendDm(username: string, message: string) {
    const userResult = await this.ig.user.searchExact(username)
    if (!userResult) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    const userId = await this.ig.user.getIdByUsername(username)
    const thread = this.ig.entity.directThread([userId.toString()])
    const res = await thread.broadcastText(message)
    console.log('메시지 전송 성공:', res)
    return res
  }

  async getUserProfile(username: string) {
    const user = await this.ig.user.searchExact(username)
    const userInfo = await this.ig.user.info(user.pk)
    return userInfo
  }

  async getAccountsByKeyword(keyword: string, minResults: number = 25) {
    const res = this.ig.feed.tags(keyword)
    let accounts = []
    do {
      const results = await res.items()
      accounts = accounts.concat(
        results
          .filter(post => post && post.user)
          .map(post => ({
            username: post.user.username,
            fullName: post.user.full_name,
            pk: post.user.pk,
            isPrivate: post.user.is_private,
            profilePicUrl: post.user.profile_pic_url,
          })),
      )
    } while (accounts.length < minResults && res.isMoreAvailable())
    return accounts
  }
}
