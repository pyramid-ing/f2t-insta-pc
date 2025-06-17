import {
  InstagramActionResponse,
  InstagramLoginResponse,
  InstagramLoginStatus,
} from '@main/app/modules/instagram/api/interfaces/instagram.interface'
import { humanClick, humanType } from '@main/app/utils/human-actions'
import { sleep } from '@main/app/utils/sleep'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Page } from 'puppeteer-core'
import { InstagramBaseService } from './instagram-base.service'
import { InstagramBrowserService } from './instagram-browser.service'

// 로그인 관련 파라미터 타입 정의
export interface LoginParams {
  username: string
  password: string
  headless?: boolean
}

@Injectable()
export class InstagramLoginService extends InstagramBaseService {
  private isLoggedIn: boolean = false
  private currentUsername: string = null

  constructor(
    protected readonly configService: ConfigService,
    protected readonly browserService: InstagramBrowserService,
  ) {
    super(configService, browserService)
  }

  async login(params: LoginParams, page?: Page): Promise<InstagramLoginResponse> {
    const { username, password } = params
    let localPage = page
    if (!localPage) {
      localPage = await this.browserService.getPage()
    }
    try {
      if (await this.checkLoginStatus(localPage)) {
        throw new Error('이미 로그인되어 있습니다.')
      }
      await localPage.waitForSelector('input')

      // 로그인 페이지 타입 감지 및 셀렉터 결정
      const loginSelectors = await localPage.evaluate(() => {
        // 1. input[name="username"] 타입
        const usernameInput = document.querySelector('input[name="username"]')
        const passwordInput = document.querySelector('input[name="password"]')
        const submitBtn = document.querySelector('button[type="submit"]')
        if (usernameInput && passwordInput && submitBtn) {
          return {
            username: 'input[name="username"]',
            password: 'input[name="password"]',
            submit: 'button[type="submit"]',
          }
        }
        // 2. aria-label 기반 타입 (영문)
        const usernameAria = document.querySelector('input[aria-label="Phone number, username, or email"]')
        const passwordAria = document.querySelector('input[aria-label="Password"]')
        if (usernameAria && passwordAria && submitBtn) {
          return {
            username: 'input[aria-label="Phone number, username, or email"]',
            password: 'input[aria-label="Password"]',
            submit: 'button[type="submit"]',
          }
        }
        // 3. aria-label 기반 타입 (한글)
        const usernameAriaKo = document.querySelector('input[aria-label="전화번호, 사용자 이름 또는 이메일"]')
        const passwordAriaKo = document.querySelector('input[aria-label="비밀번호"]')
        if (usernameAriaKo && passwordAriaKo && submitBtn) {
          return {
            username: 'input[aria-label="전화번호, 사용자 이름 또는 이메일"]',
            password: 'input[aria-label="비밀번호"]',
            submit: 'button[type="submit"]',
          }
        }
        // 4. login_page_3.html 타입 (input[name=email], input[name=pass], 한글 aria-label)
        const usernameEmail = document.querySelector(
          'input[name="email"][aria-label="휴대폰 번호, 사용자 이름 또는 이메일 주소"]',
        )
        const passwordPass = document.querySelector('input[name="pass"][aria-label="비밀번호"]')
        const submitBtn3 = document.querySelector('button[type="submit"]')
        if (usernameEmail && passwordPass && submitBtn3) {
          return {
            username: 'input[name="email"][aria-label="휴대폰 번호, 사용자 이름 또는 이메일 주소"]',
            password: 'input[name="pass"][aria-label="비밀번호"]',
            submit: 'button[type="submit"]',
          }
        }
        // 5. 기타 타입 추가 가능
        return null
      })

      if (!loginSelectors)
        throw new Error('로그인 폼을 찾을 수 없습니다.')

      await humanClick(localPage, loginSelectors.username)
      await humanType(localPage, loginSelectors.username, username)
      await sleep(1000)
      await humanClick(localPage, loginSelectors.password)
      await humanType(localPage, loginSelectors.password, password)
      await sleep(1000)
      await humanClick(localPage, loginSelectors.submit)

      await localPage.waitForNavigation()
      // 로그인 정보 저장 다이얼로그가 뜨면 '정보 저장' 버튼 클릭
      try {
        await localPage.waitForSelector('button._acan._acap._acas._aj1-._ap30', { timeout: 3000 })
        // '정보 저장' 버튼 텍스트 확인 후 클릭
        const saveBtnIndex = await localPage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button._acan._acap._acas._aj1-._ap30'))
          for (let i = 0; i < btns.length; i++) {
            if (btns[i].textContent?.trim() === '정보 저장')
              return i
          }
          return -1
        })
        if (saveBtnIndex !== -1) {
          const saveBtnSelector = `button._acan._acap._acas._aj1-._ap30:nth-of-type(${saveBtnIndex + 1})`
          await humanClick(localPage, saveBtnSelector)
        }
      }
      catch (e) {
        // 다이얼로그가 안 뜨면 무시
      }

      try {
        const isLoggedIn = await this.checkLoginStatus(localPage)
        if (isLoggedIn) {
          await this.browserService.saveCookies(localPage.browserContext().browser(), username)
          return { success: true, userId: username }
        }
        return { success: false, error: '로그인 실패' }
      }
      catch (error) {
        return { success: false, error: '로그인 실패' }
      }
    }
    catch (error) {
      return { success: false, error: error.message }
    }
    finally {
      if (!page && localPage)
        await localPage.close()
    }
  }

  async isLogin(page?: Page): Promise<InstagramLoginStatus> {
    let localPage = page
    if (!localPage) {
      localPage = await this.browserService.getPage()
    }
    try {
      const isLoggedIn = await this.checkLoginStatus(localPage)
      return {
        isLoggedIn,
        username: this.currentUsername,
      }
    }
    finally {
      if (!page && localPage)
        await localPage.close()
    }
  }

  async signout(page?: Page): Promise<InstagramActionResponse> {
    if (!this.isLoggedIn) {
      return { success: false, error: '이미 로그아웃 상태입니다.' }
    }
    let localPage = page
    if (!localPage) {
      localPage = await this.browserService.getPage()
    }
    await this.browserService.gotoIfChanged(localPage, 'https://www.instagram.com/accounts/logout/')
    this.isLoggedIn = false
    this.currentUsername = null
    if (!page && localPage)
      await localPage.close()
    return { success: true }
  }

  async ensureHome(page?: Page): Promise<void> {
    let localPage = page
    if (!localPage) {
      localPage = await this.browserService.getPage()
    }
    if (!localPage.url().startsWith('https://www.instagram.com')) {
      await localPage.goto('https://www.instagram.com')
    }
    if (!page && localPage)
      await localPage.close()
  }
}
