import { SettingsService } from '@main/app/modules/settings/settings.service'
import { sleep } from '@main/app/utils/sleep'
import { Body, Controller, HttpException, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { File as MulterFile } from 'multer'
import * as fs from 'node:fs'
import { Page } from 'playwright'
import * as XLSX from 'xlsx'
import { WorkflowService } from '../../workflow/workflow.service'
import { WorkflowExportXlsxDto, WorkflowSendDmToDto } from './dto/instagram-workflow.dto'

@Controller('instagram/workflow')
export class InstagramWorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getRandomDelayFromSettings(): Promise<number> {
    const delaySettings = await this.settingsService.getDelaySettings()
    const { minDelay, maxDelay } = delaySettings
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }

  @Post('export-posts-xlsx')
  async exportPostsToXlsx(@Body() dto: WorkflowExportXlsxDto, @Res() res: Response) {
    // app 설정에서 브라우저 창 표시 여부 가져오기
    const globalSetting = await this.settingsService.getGlobalSettings()

    const { context, browser } = await this.workflowService.launch(false)
    try {
      // 쿠키 로드 시도 (username은 'instagram' 등 고정값 또는 실제 사용자명)
      await this.workflowService.loadCookiesToBrowser(context, 'instagram')
      const page = await context.newPage()
      await page.goto('https://www.instagram.com')
      await sleep(await this.getRandomDelayFromSettings())

      // 로그인 상태 체크
      const isLoggedIn = await this.workflowService.checkInstagramLoginStatus(page)

      if (!isLoggedIn) {
        // 로그인되지 않은 경우 자동 로그인 수행
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' })
        await sleep(await this.getRandomDelayFromSettings())

        // 설정에서 로그인 정보 가져오기
        if (!globalSetting.loginId || !globalSetting.loginPassword) {
          await page.close()
          throw new HttpException(
            '로그인 정보가 저장되지 않았습니다. 설정에서 인스타그램 로그인 정보를 입력해주세요.',
            HttpStatus.BAD_REQUEST,
          )
        }

        // 사용자명 입력
        await page.fill('input[name="username"]', globalSetting.loginId)
        await sleep(500)

        // 비밀번호 입력
        await page.fill('input[name="password"]', globalSetting.loginPassword)
        await sleep(500)

        // 로그인 버튼 클릭
        await page.click('button[aria-label="로그인"]')
        await sleep(3000)

        // 로그인 성공 확인 (최대 30초 대기)
        const loginStart = Date.now()
        let loginSuccess = false
        while (Date.now() - loginStart < 30000) {
          await sleep(1000)
          loginSuccess = await this.workflowService.checkInstagramLoginStatus(page)
          if (loginSuccess) {
            // 정보 저장 다이얼로그 처리
            await this.handleSaveInfoDialog(page)
            // 쿠키 저장
            await this.workflowService.saveCookies(page.context().browser(), 'instagram')
            break
          }
        }

        if (!loginSuccess) {
          await page.close()
          throw new HttpException('로그인에 실패했습니다. 로그인 정보를 확인해주세요.', HttpStatus.UNAUTHORIZED)
        }

        // 로그인 성공 후 메인 페이지로 이동
        await page.goto('https://www.instagram.com')
        await sleep(await this.getRandomDelayFromSettings())
      }

      // 3. 유저 목록 추출 (검색)
      const searchResult = await this.workflowService.instagramSearch(
        {
          keyword: dto.keyword,
          limit: dto.limit,
          headless: false,
        },
        page,
      )

      if (!searchResult.success) {
        await page.close()
        throw new HttpException('검색 실패', HttpStatus.BAD_REQUEST)
      }

      // 4. 엑셀 데이터 생성 (id, pw, 대상id, DM내용, 팔로우)
      const rows = searchResult.posts.map(post => ({
        targetId: post.owner?.username || '',
        dm: '',
        follow: '',
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.send(buffer)
    } finally {
      await browser.close()
    }
  }

  @Post('send-dm-to')
  @UseInterceptors(FileInterceptor('file'))
  async sendDmTo(@UploadedFile() file: MulterFile, @Body() body: WorkflowSendDmToDto, @Res() res: Response) {
    if (!file) {
      throw new HttpException('엑셀 파일이 필요합니다.', HttpStatus.BAD_REQUEST)
    }

    // 1. 엑셀 파싱
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    if (!rows.length) {
      throw new HttpException('엑셀 데이터가 비어있습니다.', HttpStatus.BAD_REQUEST)
    }

    // app 설정에서 브라우저 창 표시 여부 가져오기
    const globalSetting = await this.settingsService.findByKey('global')
    let headless = true

    const { context, browser } = await this.workflowService.launch(headless)
    try {
      // 쿠키 로드 시도 (username은 'instagram' 등 고정값 또는 실제 사용자명)
      await this.workflowService.loadCookiesToBrowser(context, 'instagram')
      const page = await context.newPage()
      await page.goto('https://www.instagram.com')
      await sleep(await this.getRandomDelayFromSettings())

      // 4. 각 행마다 자동 처리 (동일 page 재사용)
      const results = []
      for (const row of rows) {
        const { targetId, dm, follow } = row as any
        await page.goto(`https://www.instagram.com/${targetId}/`)

        let followResult = null
        let dmResult = null

        if (follow === 1 || follow === '1') {
          followResult = await this.workflowService.instagramFollow(
            { username: targetId, loginUsername: 'instagram' },
            page,
          )
        }

        if (dm) {
          dmResult = await this.workflowService.instagramSendDm(
            { username: targetId, message: dm, loginUsername: 'instagram' },
            page,
          )
        }

        results.push({ targetId, followResult, dmResult })
        await sleep(await this.getRandomDelayFromSettings())
      }

      res.json({ success: true, results })
    } finally {
      await browser.close()
    }
  }

  /**
   * 로그인 후 '정보 저장' 다이얼로그 자동 처리
   */
  private async handleSaveInfoDialog(page: Page) {
    try {
      // 다양한 형태의 다이얼로그 처리
      await sleep(2000) // 다이얼로그가 나타날 시간을 기다림

      // 방법 1: 텍스트 기반으로 "정보 저장" 버튼 찾기
      const saveInfoBtn = page.locator('button, div[role="button"]').filter({ hasText: /정보 저장|Save info/i })
      const saveInfoBtnCount = await saveInfoBtn.count()

      if (saveInfoBtnCount > 0) {
        await saveInfoBtn.first().click()
        console.log('로그인 정보 저장 버튼을 클릭했습니다.')
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
            console.log('로그인 정보 저장 버튼을 클릭했습니다.')
          }
        }
      }
    } catch (error) {
      console.warn('로그인 정보 저장 다이얼로그 처리 중 오류:', error.message)
      // 다이얼로그가 안 뜨거나 처리 실패 시 무시
    }
  }

  /**
   * 인스타그램 수동 로그인 워크플로우 (로그인만 수행)
   */
  @Post('login')
  async workflowLogin(@Res() res: Response) {
    const { context, browser } = await this.workflowService.launch(false)

    try {
      // 쿠키 로드 시도 (username은 'instagram' 등 고정값 또는 실제 사용자명)
      await this.workflowService.loadCookiesToBrowser(context, 'instagram')
      const page = await context.newPage()
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' })

      // 1분 동안 1초마다 로그인 체크
      const start = Date.now()
      let isLoggedIn = false
      while (Date.now() - start < 60000) {
        await sleep(1000)
        isLoggedIn = await this.workflowService.checkInstagramLoginStatus(page)
        if (isLoggedIn) {
          await sleep(3000)
          await this.handleSaveInfoDialog(page)
          await this.workflowService.saveCookies(page.context().browser(), 'instagram')
          return res.json({ success: true, message: '인스타그램 로그인이 완료되었습니다.' })
        }
      }

      return res
        .status(408)
        .json({ success: false, message: '로그인 대기 시간이 초과되었습니다. 1분 내에 로그인해주세요.' })
    } catch (error) {
      return res.status(500).json({ success: false, message: `로그인 워크플로우 실패: ${error.message}` })
    } finally {
      await browser.close()
    }
  }

  /**
   * 인스타그램 로그인 쿠키 초기화 (로그아웃)
   */
  @Post('logout')
  async workflowLogout(@Res() res: Response) {
    try {
      // 쿠키 파일 경로 (username은 'instagram'으로 고정)
      const cookiePath = this.workflowService.getCookiePath('instagram')
      if (fs.existsSync(cookiePath)) {
        fs.unlinkSync(cookiePath)
      }
      return res.json({ success: true, message: '로그인 정보가 초기화되었습니다.' })
    } catch (error) {
      return res.status(500).json({ success: false, message: `로그아웃 실패: ${error.message}` })
    }
  }
}
