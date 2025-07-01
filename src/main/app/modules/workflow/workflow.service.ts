import { humanClick, humanType } from '@main/app/utils/human-actions'
import { sleep } from '@main/app/utils/sleep'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Browser, BrowserContext, chromium, ElementHandle, Page } from 'playwright'

export interface LoginParams {
  id: string
  pw: string
}

// Instagram 관련 인터페이스들
export interface InstagramActionResponse {
  success: boolean
  error?: string
}

export interface InstagramLoginResponse extends InstagramActionResponse {
  userId?: string
}

export interface FollowParams {
  username: string
  loginUsername?: string
  headless?: boolean
}

export interface SendDmParams {
  username: string
  message: string
  loginUsername?: string
  headless?: boolean
}

export interface SearchParams {
  keyword: string
  loginUsername?: string
  limit?: number
  headless?: boolean
}

export interface InstagramUser {
  id: string
  username: string
  profilePicUrl: string
  isPrivate: boolean
  isVerified: boolean
}

export interface InstagramPost {
  id: string
  shortcode: string
  displayUrl: string
  caption: string
  owner: InstagramUser
  likeCount: number
  commentCount: number
  timestamp: string
}

export interface InstagramSearchResult {
  success: boolean
  error?: string
  posts: InstagramPost[]
  users: InstagramUser[]
  tags: string[]
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name)
  private isLoggedIn: boolean = false
  private currentUsername: string = null

  constructor(private readonly configService: ConfigService) {}

  async launch(headless: boolean) {
    const browser = await chromium.launch({
      headless,
      executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH,
    })

    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    // 세션 스토리지 초기화
    await context.addInitScript(() => {
      window.sessionStorage.clear()
      window.sessionStorage.setItem('barcelona_mobile_upsell_state', '1')
    })

    return { browser, context }
  }

  async login(page: Page, params: LoginParams) {
    const { id, pw } = params
    await page.goto('https://www.instagram.com/accounts/login/')
    await page.waitForTimeout(3000)

    const loginButtonSelector = 'a[role="link"]'
    await page.waitForSelector(loginButtonSelector, { timeout: 30000 })
    const loginButton = await page.$(loginButtonSelector)
    if (loginButton) {
      await loginButton.click()
    } else {
      throw new Error('로그인 버튼 찾을 수 없음')
    }

    await page.waitForSelector('input[autocomplete="username"]')
    await page.waitForTimeout(3000)
    await page.fill('input[autocomplete="username"]', id)
    await page.fill('input[autocomplete="current-password"]', pw)
    const passwordInput = await page.$('input[autocomplete="current-password"]')
    const parentElement = await passwordInput?.$('xpath=..')
    const siblingDiv = await parentElement?.$('xpath=following-sibling::div')
    if (siblingDiv) {
      await siblingDiv.click()
    }

    await page.waitForSelector('#barcelona-header', { timeout: 30000 })
  }

  async gotoSearch(page: Page) {
    await page.goto('https://www.threads.com/search')
    await page.waitForTimeout(3000)
  }

  async search(page: Page, keyword: string) {
    const searchInputSelector = 'input[type="search"]'
    await page.waitForSelector(searchInputSelector, { timeout: 30000 })
    await page.fill(searchInputSelector, keyword)
    await page.keyboard.press('Enter')
  }

  async waitArticles(page: Page, articleSelector: string) {
    await page.waitForSelector(articleSelector, { timeout: 30000 })
  }

  async followArticle(page: Page, article: ElementHandle<HTMLDivElement>) {
    const button = await article.$('svg[aria-label="팔로우"]')
    if (!button) {
      throw new Error('이미 팔로우 된 사용자')
    } else {
      await button.click()
      await page.waitForTimeout(3000)
      const followButton = await page.$('div.__fb-light-mode div[role="button"]')
      if (followButton) {
        await followButton.click()
      }
      await page.keyboard.press('Escape')
    }
  }

  async likeArticle(page: Page, article: ElementHandle<HTMLDivElement>) {
    const likeButton = await article.$('svg[aria-label="좋아요"]')
    if (!likeButton) {
      throw new Error('이미 좋아요 완료')
    } else {
      await likeButton.click()
    }
  }

  async repostArticle(page: Page, article: ElementHandle<HTMLDivElement>) {
    const repostButton = await article.$('svg[aria-label="리포스트"]')
    if (!repostButton) {
      throw new Error('리포스트 버튼 찾을 수 없음')
    } else {
      await repostButton.click()
      await page.waitForTimeout(3000)
      const listButtons = await page.$$('div.__fb-light-mode span')
      let isProcess = false
      for (const listButton of listButtons) {
        const listButtonText = await listButton.textContent()
        if (listButtonText?.includes('리포스트')) {
          isProcess = true
          await listButton.click()
          await page.waitForTimeout(3000)
          break
        }
      }
      if (!isProcess) {
        throw new Error('이미 리포스트 완료')
      }
    }
  }

  async commentArticle(page: Page, article: ElementHandle<HTMLDivElement>, followMessage: string) {
    const commentButton = await article.$('svg[aria-label="답글"]')
    if (!commentButton) {
      throw new Error('댓글 버튼 찾을 수 없음')
    } else {
      await commentButton.click()
      await page.waitForTimeout(3000)
      await page.keyboard.insertText(followMessage)
      await page.waitForTimeout(1000)
      const buttons = await page.$$('div.__fb-light-mode div[role="button"]')
      let isProcess = false
      // 팝업패턴
      if (buttons.length > 0) {
        for (const button of buttons) {
          const buttonText = await button.textContent()
          if (buttonText?.includes('게시')) {
            isProcess = true
            await button.click()
            break
          }
        }
      } else {
        const button = await article.$('svg[aria-label="답글"][viewBox="0 0 24 24"]')
        if (button) {
          isProcess = true
          await button.click()
        }
      }
      if (!isProcess) {
        throw new Error('댓글 전송버튼 찾을 수 없음')
      }
    }
  }

  async postArticle(page: Page, subject: string, content: string) {
    await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height - 50)
    await page.waitForTimeout(3000)
    await page.keyboard.insertText(content)
    await page.waitForTimeout(3000)
    const subjectInput = await page.$('input')
    if (subjectInput) {
      await subjectInput.fill(subject)
    } else {
      throw new Error('게시글 제목 입력 필드 찾을 수 없음')
    }
    const buttons = await page.$$('div.__fb-light-mode div[role="button"][tabindex="0"]')
    let isProcess = false
    for (const button of buttons) {
      const buttonText = await button.textContent()
      if (buttonText?.includes('게시')) {
        isProcess = true
        await button.click()
        break
      }
    }
    if (!isProcess) {
      throw new Error('게시글 게시 버튼 찾을 수 없음')
    }
    await page.waitForTimeout(5000)
  }

  async gotoIfChanged(page: Page, url: string): Promise<void> {
    const currentUrl = page.url()
    if (currentUrl !== url) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    }
  }

  // 쿠키 관리
  getCookiePath(username: string): string {
    const cookieDir = path.join(process.cwd(), 'static', 'cookies', 'instagram')
    if (!fs.existsSync(cookieDir)) {
      fs.mkdirSync(cookieDir, { recursive: true })
    }
    return path.join(cookieDir, `${username}.json`)
  }

  async saveCookies(browser: Browser, username: string): Promise<void> {
    try {
      const contexts = browser.contexts()
      if (contexts.length > 0) {
        const cookies = await contexts[0].cookies()
        const cookiePath = this.getCookiePath(username)
        fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2))
        this.logger.log(`쿠키가 저장되었습니다: ${cookiePath}`)
      }
    } catch (error) {
      this.logger.error(`쿠키 저장 실패: ${error.message}`)
    }
  }

  async loadCookiesToBrowser(browserContext: BrowserContext, username: string): Promise<void> {
    try {
      const cookiePath = this.getCookiePath(username)
      if (fs.existsSync(cookiePath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
        await browserContext.addCookies(cookies)
        this.logger.log(`쿠키가 로드되었습니다: ${cookiePath}`)
      }
    } catch (error) {
      this.logger.error(`쿠키 로드 실패: ${error.message}`)
    }
  }

  // 로그인 상태 확인
  async checkInstagramLoginStatus(page: Page): Promise<boolean> {
    try {
      await page.goto('https://www.instagram.com', { waitUntil: 'networkidle' })
      await sleep(2000)

      // "로그인" 텍스트가 있는 링크를 찾아서 없으면 로그인된 상태로 판단
      const loginLinks = await page.locator('a:has-text("로그인")').all()
      const isLoggedIn = loginLinks.length === 0

      return isLoggedIn
    } catch (error) {
      this.logger.error(`로그인 상태 확인 실패: ${error.message}`)
      return false
    }
  }

  // 로그인 보장
  async ensureInstagramLogin(page: Page): Promise<void> {
    const isLoggedIn = await this.checkInstagramLoginStatus(page)
    if (!isLoggedIn) {
      throw new Error('인스타그램 로그인이 필요합니다.')
    }
  }

  // Instagram 로그인
  async instagramLogin(params: { username: string; password: string }, page?: Page): Promise<InstagramLoginResponse> {
    const { username, password } = params

    try {
      if (await this.checkInstagramLoginStatus(page)) {
        throw new Error('이미 로그인되어 있습니다.')
      }

      await page.waitForSelector('input')

      // 로그인 페이지 타입 감지 및 셀렉터 결정
      const loginSelectors = await page.evaluate(() => {
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

        return null
      })

      if (!loginSelectors) {
        throw new Error('로그인 폼을 찾을 수 없습니다.')
      }

      await humanClick(page, loginSelectors.username)
      await humanType(page, loginSelectors.username, username)
      await sleep(1000)
      await humanClick(page, loginSelectors.password)
      await humanType(page, loginSelectors.password, password)
      await sleep(1000)
      await humanClick(page, loginSelectors.submit)

      await page.waitForNavigation()

      // 로그인 정보 저장 다이얼로그가 뜨면 '정보 저장' 버튼 클릭
      try {
        // 다양한 형태의 다이얼로그 처리
        await sleep(2000) // 다이얼로그가 나타날 시간을 기다림

        // 방법 1: 텍스트 기반으로 "정보 저장" 버튼 찾기
        const saveInfoBtn = page.locator('button, div[role="button"]').filter({ hasText: /정보 저장|Save info/i })
        const saveInfoBtnCount = await saveInfoBtn.count()

        if (saveInfoBtnCount > 0) {
          await saveInfoBtn.first().click()
          this.logger.log('로그인 정보 저장 버튼을 클릭했습니다.')
        } else {
          // 방법 2: span 내부 텍스트를 기준으로 부모 버튼 찾기
          const saveSpan = page.locator('span').filter({ hasText: /정보 저장|Save info/i })
          const saveSpanCount = await saveSpan.count()

          if (saveSpanCount > 0) {
            // span의 상위 clickable 요소 찾기
            const parentBtn = saveSpan.first().locator('xpath=ancestor::*[@role="button" or local-name()="button"][1]')
            const parentBtnCount = await parentBtn.count()

            if (parentBtnCount > 0) {
              await parentBtn.click()
              this.logger.log('로그인 정보 저장 버튼을 클릭했습니다.')
            }
          }
        }
      } catch (error) {
        this.logger.warn('로그인 정보 저장 다이얼로그 처리 중 오류:', error.message)
        // 다이얼로그가 안 뜨거나 처리 실패 시 무시
      }

      try {
        const isLoggedIn = await this.checkInstagramLoginStatus(page)
        if (isLoggedIn) {
          await this.saveCookies(page.context().browser(), username)
          return { success: true, userId: username }
        }
        return { success: false, error: '로그인 실패' }
      } catch {
        return { success: false, error: '로그인 실패' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // Instagram 팔로우
  async instagramFollow(params: FollowParams, page?: Page): Promise<InstagramActionResponse> {
    const { username, loginUsername } = params

    try {
      await this.ensureInstagramLogin(page)
      await this.gotoIfChanged(page, `https://www.instagram.com/${username}/`)
      await page.waitForSelector('header')

      // 텍스트 기반으로 팔로우 버튼 찾기 (영어/한글 모두 지원)
      const followButton = page
        .locator('header button')
        .filter({ hasText: /follow|팔로우/i })
        .first()
      const followButtonCount = await followButton.count()

      if (followButtonCount === 0) {
        return { success: false, error: '이미 팔로우 중이거나 팔로우할 수 없는 계정입니다.' }
      }

      await followButton.click()
      await sleep(2000)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // Instagram 언팔로우
  async instagramUnfollow(params: FollowParams, page?: Page): Promise<InstagramActionResponse> {
    const { username, loginUsername } = params

    try {
      await this.ensureInstagramLogin(page)
      await this.gotoIfChanged(page, `https://www.instagram.com/${username}/`)
      await page.waitForSelector('header')

      // 텍스트 기반으로 팔로잉 버튼 찾기 (영어/한글 모두 지원)
      const followingButton = page
        .locator('header button')
        .filter({ hasText: /following|팔로잉/i })
        .first()
      const followingButtonCount = await followingButton.count()

      if (followingButtonCount === 0) {
        return { success: false, error: '팔로우 중이 아닌 계정입니다.' }
      }

      await followingButton.click()

      // 팝업에서 '팔로우 취소' 또는 'unfollow' 텍스트가 포함된 버튼 클릭
      await page.waitForSelector('div[role="dialog"] button, div[role="dialog"] [role="button"]')

      const unfollowBtn = page
        .locator('div[role="dialog"] button, div[role="dialog"] [role="button"]')
        .filter({ hasText: /unfollow|팔로우 취소/i })
        .first()
      const unfollowBtnCount = await unfollowBtn.count()

      if (unfollowBtnCount > 0) {
        await unfollowBtn.click()
      }

      await sleep(2000)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // Instagram 팔로우 상태 확인
  async instagramIsFollow(params: FollowParams, page?: Page): Promise<boolean> {
    const { username, loginUsername } = params

    try {
      await this.ensureInstagramLogin(page)
      await this.gotoIfChanged(page, `https://www.instagram.com/${username}/`)
      await page.waitForSelector('button')

      // 텍스트 기반으로 팔로잉 상태 버튼 찾기 (영어/한글 모두 지원)
      const followingButton = page.locator('button').filter({ hasText: /following|팔로잉/i })
      const isFollowing = (await followingButton.count()) > 0

      return isFollowing
    } catch (error) {
      throw new Error(`팔로우 상태 확인 실패: ${error.message}`)
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // Instagram DM 전송
  async instagramSendDm(params: SendDmParams, page?: Page): Promise<InstagramActionResponse> {
    const { username, message, loginUsername } = params

    try {
      await this.ensureInstagramLogin(page)
      await this.gotoIfChanged(page, `https://www.instagram.com/${username}`)
      await page.waitForSelector('header div[role="button"]')
      await sleep(2000)

      // 메시지 보내기 버튼 찾기
      const msgBtn = page
        .locator('header div[role="button"]')
        .filter({ hasText: /메시지 보내기|Message/i })
        .first()
      const msgBtnCount = await msgBtn.count()

      if (msgBtnCount === 0) {
        throw new Error('메시지 보내기 버튼을 찾을 수 없습니다.')
      }

      await msgBtn.click()
      await page.waitForNavigation({ waitUntil: 'networkidle' })
      await sleep(2000)

      // "나중에 하기" 다이얼로그 처리
      const laterBtn = page
        .locator('div[role="dialog"] button')
        .filter({ hasText: /나중에 하기|not now/i })
        .first()
      const laterBtnCount = await laterBtn.count()
      if (laterBtnCount > 0) {
        await laterBtn.click()
      }

      await page.waitForSelector('[contenteditable="true"]')
      await sleep(1000)
      await humanClick(page, '[contenteditable="true"]')
      await sleep(500)
      await humanType(page, '[contenteditable="true"]', message)
      await sleep(500)
      await page.keyboard.press('Enter')
      await sleep(2000)

      return { success: true }
    } catch (error) {
      this.logger.error(`DM 전송 실패 (${username}): ${error.message}`)
      return { success: false, error: error.message }
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // Instagram 검색
  async instagramSearch(params: SearchParams, page?: Page): Promise<InstagramSearchResult> {
    const { keyword, loginUsername, limit = 10 } = params

    try {
      const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(keyword)}`
      await this.gotoIfChanged(page, searchUrl)
      await page.waitForSelector('div[class*="x1qjc9v5"][class*="x972fbf"][class*="x10w94by"]')
      await humanClick(page, 'div[class*="x1qjc9v5"][class*="x972fbf"][class*="x10w94by"]')
      await page.waitForSelector('div[role="dialog"]')
      await sleep(1000)

      const posts: InstagramPost[] = []

      for (let i = 0; i < limit; i++) {
        try {
          const post = await page.evaluate(() => {
            const dialog = document.querySelector('div[role="dialog"]')
            if (!dialog) return null

            const postUrl = window.location.href
            const postId = postUrl.split('/p/')?.[1]?.replace('/', '') || ''
            const img = dialog.querySelector('img[style*="object-fit"]') as HTMLImageElement
            const ownerLink = dialog.querySelector('header ._aaqt a[role="link"]') as HTMLAnchorElement
            const ownerImg = dialog.querySelector('header img') as HTMLImageElement
            const verifiedBadge = dialog.querySelector('[aria-label="인증됨"]')
            const likeCount = parseInt(dialog.querySelector('section span')?.textContent?.replace(/\D/g, '') || '0')
            const caption = dialog.querySelector('ul > div')?.textContent || ''
            const commentCount = parseInt(dialog.querySelector('ul')?.childElementCount?.toString() || '0')

            return {
              id: postId,
              shortcode: postId,
              displayUrl: img?.src || '',
              caption,
              owner: {
                id: ownerLink?.href?.split('/')?.filter(Boolean)?.pop() || '',
                username: ownerLink?.textContent || '',
                profilePicUrl: ownerImg?.src || '',
                isPrivate: false,
                isVerified: !!verifiedBadge,
              },
              likeCount,
              commentCount,
              timestamp: new Date().toISOString(),
            }
          })

          if (post) {
            posts.push(post)
          }

          await page.keyboard.press('ArrowRight')
          await sleep(1000)
        } catch (error) {
          this.logger.error(`포스트 추출 실패: ${error.message}`)
          break
        }
      }

      return {
        success: true,
        posts,
        users: [],
        tags: [],
      }
    } catch (error) {
      this.logger.error(`검색 실패 (${keyword}): ${error.message}`)
      return {
        success: false,
        error: error.message,
        posts: [],
        users: [],
        tags: [],
      }
    } finally {
      if (!page && page) {
        await page.close()
      }
    }
  }

  // // Instagram 로그인 상태 확인 API
  // async checkInstagramLoginStatusApi(): Promise<{ isLoggedIn: boolean; needsLogin: boolean; message: string }> {
  //   try {
  //     // headless 브라우저로 쿠키 로드 후 인스타그램 로그인 상태 확인
  //     const browser = await this.createInstagramBrowser(true)
  //     // 쿠키 로드 시도 (username은 'instagram' 등 고정값 또는 실제 사용자명)
  //     await this.loadCookiesToBrowser(browser, 'instagram')
  //     const page = await browser.newPage()
  //     await page.goto('https://www.instagram.com', { waitUntil: 'networkidle' })
  //     // 로그인 상태 확인
  //     const isLoggedIn = await this.checkInstagramLoginStatus(page)
  //     await browser.close()
  //     if (isLoggedIn) {
  //       return { isLoggedIn: true, needsLogin: false, message: '인스타그램 로그인 상태입니다.' }
  //     } else {
  //       return { isLoggedIn: false, needsLogin: true, message: '인스타그램 로그인이 필요합니다.' }
  //     }
  //   } catch (error) {
  //     return { isLoggedIn: false, needsLogin: true, message: `로그인 상태 확인 실패: ${error.message}` }
  //   }
  // }
  //
  // // Instagram 로그인 브라우저 열기
  // async openInstagramLoginBrowser(): Promise<{ success: boolean; message: string; browser?: any }> {
  //   try {
  //     const browser = await this.createInstagramBrowser(false)
  //     const loginPage: Page = await this.getInstagramPage(browser)
  //     await loginPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' })
  //     return { success: true, message: '인스타그램 로그인 창을 열었습니다.', browser }
  //   } catch (error) {
  //     return { success: false, message: `로그인 브라우저 열기 실패: ${error.message}` }
  //   }
  // }
  //
  // // Instagram 로그아웃
  // async instagramSignout(page?: Page): Promise<InstagramActionResponse> {
  //   if (!this.isLoggedIn) {
  //     return { success: false, error: '이미 로그아웃 상태입니다.' }
  //   }
  //   let page = page
  //   if (!page) {
  //     page = await this.getInstagramPage()
  //   }
  //   await this.gotoIfChanged(page, 'https://www.instagram.com/accounts/logout/')
  //   this.isLoggedIn = false
  //   this.currentUsername = null
  //   if (!page && page) {
  //     await page.close()
  //   }
  //   return { success: true }
  // }
}
