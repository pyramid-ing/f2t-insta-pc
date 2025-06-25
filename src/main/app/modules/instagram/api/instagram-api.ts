import { Injectable } from '@nestjs/common'
import { IgApiClient } from 'instagram-private-api'
import * as fs from 'fs'
import * as path from 'path'

const SESSION_PATH = path.join(__dirname, 'ig-session.json')

@Injectable()
export class InstagramApi {
  private ig: IgApiClient

  constructor() {
    this.ig = new IgApiClient()
  }

  async saveSession() {
    const state = await this.ig.state.serialize()
    fs.writeFileSync(SESSION_PATH, JSON.stringify(state))
  }

  async loadSession() {
    if (fs.existsSync(SESSION_PATH)) {
      const savedState = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf-8'))
      await this.ig.state.deserialize(savedState)
      return true
    }
    return false
  }

  async login(username: string, password: string) {
    if (await this.loadSession()) {
      console.log('세션에서 로그인 정보 불러옴')
      return
    }
    this.ig.state.generateDevice(username)
    await this.ig.simulate.preLoginFlow()
    const loggedInUser = await this.ig.account.login(username, password)
    console.log('로그인 성공:', loggedInUser.username)
    await this.saveSession()
    return loggedInUser
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

  async getAccountsByKeyword(keyword: string) {
    const res = this.ig.feed.tags(keyword)
    const results = await res.items()
    const accounts = results
      .filter(post => post && post.user)
      .map(post => ({
        username: post.user.username,
        fullName: post.user.full_name,
        pk: post.user.pk,
        isPrivate: post.user.is_private,
        profilePicUrl: post.user.profile_pic_url,
      }))
    return accounts
  }
}
