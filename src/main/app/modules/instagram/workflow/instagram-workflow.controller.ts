import { InstagramDmService } from '@main/app/modules/instagram/api/instagram-dm.service'
import { InstagramLoginService } from '@main/app/modules/instagram/api/instagram-login.service'
import { InstagramSearchService } from '@main/app/modules/instagram/api/instagram-search.service'
import {
  WorkflowExportXlsxDto,
  WorkflowSendDmToDto,
} from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { sleep } from '@main/app/utils/sleep'
import { Body, Controller, HttpException, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { IgApiClient } from 'instagram-private-api'
import { File as MulterFile } from 'multer'
import * as XLSX from 'xlsx'

@Controller()
export class InstagramWorkflowController {
  constructor(
    private readonly searchService: InstagramSearchService,
    private readonly dmService: InstagramDmService,
    private readonly settingsService: SettingsService,
    private readonly loginService: InstagramLoginService,
  ) {}

  private async getRandomDelayFromSettings(): Promise<number> {
    const setting = await this.settingsService.findByKey('instagram')
    let minDelay = 1000
    let maxDelay = 3000
    if (setting?.data) {
      try {
        const parsed = typeof setting.data === 'string' ? JSON.parse(setting.data) : setting.data
        minDelay = parsed.minDelay ?? 1000
        maxDelay = parsed.maxDelay ?? 3000
      }
      catch {}
    }
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }

  @Post('export-posts-xlsx')
  async exportPostsToXlsx(@Body() dto: WorkflowExportXlsxDto, @Res() res: Response) {
    // 1. 인스타그램 자동 로그인
    const setting = await this.settingsService.findByKey('instagram')
    let igId: string | undefined, igPw: string | undefined
    let data = setting?.data
    if (typeof data === 'string') {
      try { data = JSON.parse(data) }
      catch {}
    }
    const dataObj = data as any
    igId = dataObj?.igId
    igPw = dataObj?.igPw
    if (!igId || !igPw) {
      throw new HttpException('인스타그램 로그인 정보가 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    const loginStatus = await this.loginService.checkLoginStatusApi({ username: igId })
    if (!loginStatus.isLoggedIn) {
      const loginResult = await this.loginService.login({ username: igId, password: igPw })
      if (!loginResult.success) {
        throw new HttpException(`인스타그램 자동로그인 실패: ${loginResult.error || ''}`, HttpStatus.BAD_REQUEST)
      }
    }
    // ig 인스턴스 생성 및 세션 로딩
    const ig = new IgApiClient()
    ig.state.generateDevice(igId)
    await this.loginService.loadSessionWithIgInstance(ig, igId)
    // 3. 유저 목록 추출 (검색)
    const searchResult = await this.searchService.search(ig, {
      keyword: dto.keyword,
      limit: dto.limit,
      loginUsername: igId,
    })
    if (!searchResult.success) {
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
  }

  @Post('send-dm-to')
  @UseInterceptors(FileInterceptor('file'))
  async sendDmTo(@UploadedFile() file: MulterFile, @Body() body: WorkflowSendDmToDto, @Res() res: Response) {
    if (!file) {
      throw new HttpException('엑셀 파일이 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    // 1. 인스타그램 자동 로그인
    const setting = await this.settingsService.findByKey('instagram')
    let igId: string | undefined, igPw: string | undefined
    let data = setting?.data
    if (typeof data === 'string') {
      try { data = JSON.parse(data) }
      catch {}
    }
    const dataObj = data as any
    igId = dataObj?.igId
    igPw = dataObj?.igPw
    if (!igId || !igPw) {
      throw new HttpException('인스타그램 로그인 정보가 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    const loginStatus = await this.loginService.checkLoginStatusApi({ username: igId })
    if (!loginStatus.isLoggedIn) {
      const loginResult = await this.loginService.login({ username: igId, password: igPw })
      if (!loginResult.success) {
        throw new HttpException(`인스타그램 자동로그인 실패: ${loginResult.error || ''}`, HttpStatus.BAD_REQUEST)
      }
    }
    // ig 인스턴스 생성 및 세션 로딩
    const ig = new IgApiClient()
    ig.state.generateDevice(igId)
    await this.loginService.loadSessionWithIgInstance(ig, igId)
    // 2. 엑셀 파싱
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    if (!rows.length) {
      throw new HttpException('엑셀 데이터가 비어있습니다.', HttpStatus.BAD_REQUEST)
    }
    // 3. 각 행마다 자동 처리
    const results = []
    for (const row of rows) {
      const { targetId, dm } = row as any
      const followResult = null
      let dmResult = null
      if (dm) {
        dmResult = await this.dmService.sendDm(ig, { username: targetId, message: dm, loginUsername: igId })
      }
      results.push({ targetId, followResult, dmResult })
      await sleep(await this.getRandomDelayFromSettings())
    }
    res.json({ success: true, results })
  }
}
