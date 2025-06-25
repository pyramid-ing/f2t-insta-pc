import * as fs from 'node:fs'
import * as path from 'node:path'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IgApiClient } from 'instagram-private-api'
import { InstagramActionResponse, InstagramLoginResponse } from './interfaces/instagram.interface'

export interface LoginParams {
  username: string
  password: string
  headless?: boolean
}

@Injectable()
export class InstagramLoginService {
  private ig: IgApiClient
  private currentUsername: string = null

  constructor(protected readonly configService: ConfigService) {
    this.ig = new IgApiClient()
  }

  private getSessionPath(username: string) {
    const cookieDir = process.env.COOKIE_DIR
    if (!fs.existsSync(cookieDir)) {
      fs.mkdirSync(cookieDir, { recursive: true })
    }
    return path.join(cookieDir, `${username}.json`)
  }

  private async saveSession(username: string) {
    const state = await this.ig.state.serialize()
    const sessionPath = this.getSessionPath(username)
    fs.writeFileSync(sessionPath, JSON.stringify(state))
  }

  public async loadSession(username: string) {
    const sessionPath = this.getSessionPath(username)
    if (fs.existsSync(sessionPath)) {
      const savedState = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))
      await this.ig.state.deserialize(savedState)
      return true
    }
    return false
  }

  public async loadSessionWithIgInstance(ig: IgApiClient, username: string) {
    const sessionPath = this.getSessionPath(username)
    if (fs.existsSync(sessionPath)) {
      const savedState = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))
      await ig.state.deserialize(savedState)
      return true
    }
    return false
  }

  async login(params: LoginParams): Promise<InstagramLoginResponse> {
    const { username, password } = params
    this.ig.state.generateDevice(username)
    // 세션 불러오기 시도
    if (await this.loadSession(username)) {
      this.currentUsername = username
      return { success: true, userId: username }
    }
    try {
      await this.ig.simulate.preLoginFlow()
      const loggedInUser = await this.ig.account.login(username, password)
      await this.saveSession(username)
      this.currentUsername = username
      return { success: true, userId: loggedInUser.username }
    }
    catch (error) {
      return { success: false, error: error.message }
    }
  }

  async signout(params?: { username?: string }): Promise<InstagramActionResponse> {
    const username = params?.username || this.currentUsername
    if (!username)
      return { success: false, error: '로그인 정보가 없습니다.' }
    const sessionPath = this.getSessionPath(username)
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath)
      this.currentUsername = null
      return { success: true }
    }
    return { success: false, error: '이미 로그아웃 상태입니다.' }
  }

  async checkLoginStatusApi(params?: { username?: string }): Promise<{ isLoggedIn: boolean, needsLogin: boolean, message: string }> {
    const username = params?.username || this.currentUsername
    if (!username)
      return { isLoggedIn: false, needsLogin: true, message: '로그인 정보가 없습니다.' }
    try {
      if (await this.loadSession(username)) {
        const user = await this.ig.account.currentUser()
        return { isLoggedIn: true, needsLogin: false, message: `${user.username}로 로그인됨` }
      }
      else {
        return { isLoggedIn: false, needsLogin: true, message: '로그인이 필요합니다.' }
      }
    }
    catch (error) {
      return { isLoggedIn: false, needsLogin: true, message: `로그인 상태 확인 실패: ${error.message}` }
    }
  }

  async openLoginBrowser(): Promise<{ success: boolean, message: string }> {
    // headless 브라우저가 아니므로, 별도 브라우저 창을 띄우는 기능은 지원하지 않음
    return { success: false, message: 'instagram-private-api는 브라우저 기반 수동 로그인을 지원하지 않습니다.' }
  }
}
