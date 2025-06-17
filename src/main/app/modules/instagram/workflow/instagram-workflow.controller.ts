import { InstagramDmService } from '@main/app/modules/instagram/api/instagram-dm.service'
import { InstagramFollowService } from '@main/app/modules/instagram/api/instagram-follow.service'
import { InstagramLoginService } from '@main/app/modules/instagram/api/instagram-login.service'
import { InstagramSearchService } from '@main/app/modules/instagram/api/instagram-search.service'
import {
  WorkflowExportXlsxDto,
  WorkflowSendDmToDto,
} from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'
import { sleep } from '@main/app/utils/sleep'
import { Body, Controller, HttpException, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import * as XLSX from 'xlsx'

@Controller()
export class InstagramWorkflowController {
  constructor(
    private readonly loginService: InstagramLoginService,
    private readonly searchService: InstagramSearchService,
    private readonly dmService: InstagramDmService,
    private readonly followService: InstagramFollowService,
  ) {}

  @Post('export-posts-xlsx')
  async exportPostsToXlsx(@Body() dto: WorkflowExportXlsxDto, @Res() res: Response) {
    // 1. 브라우저 명시적 생성 및 쿠키 적용
    const browserService = this.loginService.browserService
    await browserService.createBrowser(false, dto.loginUsername)
    const page = await browserService.getPage()
    await page.goto('https://www.instagram.com')
    await sleep(3000)
    // 2. 로그인 필요 체크 및 로그인
    const loginStatus = await this.loginService.isLogin(page)
    if (!loginStatus.isLoggedIn) {
      const loginResult = await this.loginService.login(
        { username: dto.loginUsername, password: dto.loginPassword },
        page,
      )
      if (!loginResult.success) {
        await page.close()
        throw new HttpException('로그인 실패, 로그인후 사용해주세요', HttpStatus.UNAUTHORIZED)
      }
    }
    // 3. 유저 목록 추출 (검색)
    const searchResult = await this.searchService.search({
      keyword: dto.keyword,
      loginUsername: dto.loginUsername,
      limit: dto.limit,
      headless: false,
    })
    if (!searchResult.success) {
      await page.close()
      throw new HttpException('검색 실패', HttpStatus.BAD_REQUEST)
    }
    // 4. 엑셀 데이터 생성 (id, pw, 대상id, DM내용, 팔로우)
    const rows = searchResult.posts.map(post => ({
      id: dto.loginUsername,
      pw: dto.loginPassword,
      targetId: post.owner?.username || '',
      dm: '', // DM 내용은 워크플로우에서 직접 입력/수정할 수 있도록 빈 값
      follow: '', // 팔로우 여부도 워크플로우에서 직접 입력/수정할 수 있도록 빈 값
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  }

  @Post('send-dm-to')
  @UseInterceptors(FileInterceptor('file'))
  async sendDmTo(@UploadedFile() file: Express.Multer.File, @Body() body: WorkflowSendDmToDto, @Res() res: Response) {
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
    const firstRow = rows[0] as any

    // 2. 브라우저 명시적 생성 및 쿠키 적용
    const browserService = this.loginService.browserService
    await browserService.createBrowser(false, firstRow.id)
    const page = await browserService.getPage()
    await page.goto('https://www.instagram.com')
    await sleep(3000)
    // 3. 로그인 필요 체크 및 로그인
    const loginStatus = await this.loginService.isLogin(page)
    if (!loginStatus.isLoggedIn) {
      const loginResult = await this.loginService.login({ username: firstRow.id, password: firstRow.pw }, page)
      if (!loginResult.success) {
        await page.close()
        throw new HttpException('로그인 실패, 로그인후 사용해주세요', HttpStatus.UNAUTHORIZED)
      }
    }
    // 4. 각 행마다 자동 처리 (동일 page 재사용)
    const results = []
    for (const row of rows) {
      const { targetId, dm, follow } = row as any
      await page.goto(`https://www.instagram.com/${targetId}/`)
      let followResult = null
      let dmResult = null
      if (follow === 1 || follow === '1') {
        followResult = await this.followService.follow({ username: targetId, loginUsername: firstRow.id }, page)
      }
      if (dm) {
        dmResult = await this.dmService.sendDm({ username: targetId, message: dm, loginUsername: firstRow.id }, page)
      }
      results.push({ targetId, followResult, dmResult })
    }
    await page.close()
    res.json({ success: true, results })
  }
}
