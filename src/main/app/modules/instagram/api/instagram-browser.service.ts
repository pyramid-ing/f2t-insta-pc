import fs from 'node:fs'
import path from 'node:path'
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Browser, Page } from 'puppeteer-core'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

@Injectable()
export class InstagramBrowserService implements OnModuleDestroy {
  private browser: Browser = null
  private headless: boolean = false
  private page: Page = null
  private cookiesDir = 'static/cookies/instagram'

  async createBrowser(headless = false, loginUsername?: string) {
    if (!this.browser) {
      this.headless = headless
      this.browser = await puppeteerExtra.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      })
      if (loginUsername) {
        const pages = await this.browser.pages()
        if (pages.length > 0) {
          await this.loadCookiesToBrowser(this.browser, loginUsername)
        }
      }
    }
    return this.browser
  }

  async getPage(): Promise<Page> {
    if (!this.browser) {
      await this.createBrowser(this.headless)
    }

    const pages = await this.browser.pages()
    if (pages.length > 0) {
      this.page = pages[0]
    }
    else {
      this.page = await this.browser.newPage()
    }
    await this.page.setViewport({ width: 1280, height: 800 })
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    })
    return this.page
  }

  async gotoIfChanged(page: Page, url: string) {
    if (page.url() !== url) {
      await page.goto(url)
    }
  }

  async onModuleDestroy() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private getCookiePath(username: string): string {
    return path.join(process.cwd(), this.cookiesDir, getCookieJsonName(username))
  }

  public async loadCookiesToBrowser(browser: Browser, username: string): Promise<boolean> {
    try {
      const cookiePath = this.getCookiePath(username)
      if (!fs.existsSync(cookiePath)) {
        return false
      }
      const cookiesString = fs.readFileSync(cookiePath, 'utf8')
      const cookies = JSON.parse(cookiesString)
      await browser.setCookie(...cookies)
      return true
    }
    catch (error) {
      console.error(`쿠키 로드 실패 (Browser, ${username}): ${error.message}`)
      return false
    }
  }

  public async saveCookies(browser: Browser, username: string) {
    const cookies = await browser.cookies()
    fs.writeFileSync(this.getCookiePath(username), JSON.stringify(cookies))
  }
}
