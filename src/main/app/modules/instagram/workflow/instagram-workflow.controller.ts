import { InstagramApi } from '@main/app/modules/instagram/api/instagram-api'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { sleep } from '@main/app/utils/sleep'
import { Body, Controller, HttpException, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { File as MulterFile } from 'multer'
import * as XLSX from 'xlsx'
import {
  WorkflowExportXlsxDto,
  WorkflowSendDmToDto,
} from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'

@Controller()
export class InstagramWorkflowController {
  constructor(
    private readonly instagramApi: InstagramApi,
    private readonly settingsService: SettingsService,
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
      } catch {}
    }
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }

  @Post('export-posts-xlsx')
  async exportPostsToXlsx(@Body() dto: WorkflowExportXlsxDto, @Res() res: Response) {
    const setting = await this.settingsService.findByKey('instagram')
    let igId: string | undefined, igPw: string | undefined
    let data = setting?.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {}
    }
    const dataObj = data as any
    igId = dataObj?.igId
    igPw = dataObj?.igPw
    if (!igId || !igPw) {
      throw new HttpException('인스타그램 로그인 정보(아이디/비밀번호)가 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    await this.instagramApi.login(igId, igPw)
    const accounts = await this.instagramApi.getAccountsByKeyword(dto.keyword, dto.limit)
    if (!accounts.length) {
      throw new HttpException(
        `'${dto.keyword}'(으)로는 인스타그램에서 검색 결과가 없습니다. 다른 키워드를 입력해 주세요.`,
        HttpStatus.BAD_REQUEST,
      )
    }
    const rows = accounts.map(account => ({
      유저명: account.fullName,
      유저ID: account.username,
      '프로필 링크': `https://instagram.com/${account.username}`,
      DM: '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: ['유저명', '유저ID', '프로필 링크', 'DM'] })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buffer)
  }

  @Post('send-dm-to')
  @UseInterceptors(FileInterceptor('file'))
  async sendDmTo(@UploadedFile() file: MulterFile, @Body() body: WorkflowSendDmToDto, @Res() res: Response) {
    if (!file) {
      throw new HttpException('엑셀 파일이 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    const setting = await this.settingsService.findByKey('instagram')
    let igId: string | undefined, igPw: string | undefined
    let data = setting?.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {}
    }
    const dataObj = data as any
    igId = dataObj?.igId
    igPw = dataObj?.igPw
    if (!igId || !igPw) {
      throw new HttpException('인스타그램 로그인 정보(아이디/비밀번호)가 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    await this.instagramApi.login(igId, igPw)
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    if (!rows.length) {
      throw new HttpException('엑셀 데이터가 비어있습니다.', HttpStatus.BAD_REQUEST)
    }
    const results = []
    for (const row of rows) {
      const { 유저ID, DM } = row as any
      let dmResult = null
      const dmMessage = typeof DM === 'string' ? DM : DM ? String(DM) : ''
      if (dmMessage) {
        dmResult = await this.instagramApi.sendDm(유저ID, dmMessage)
        await sleep(await this.getRandomDelayFromSettings())
      }
      results.push({ 유저ID, dmResult })
    }
    res.json({ success: true, results })
  }
}
