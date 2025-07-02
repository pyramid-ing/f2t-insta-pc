import { InstagramApi } from '@main/app/modules/instagram/api/instagram-api'
import {
  WorkflowExportXlsxDto,
  WorkflowSendDmToDto,
} from '@main/app/modules/instagram/workflow/dto/instagram-worflow.dto'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { sleep } from '@main/app/utils/sleep'
import { Body, Controller, HttpException, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { File as MulterFile } from 'multer'
import * as XLSX from 'xlsx'

@Controller()
export class InstagramWorkflowController {
  constructor(
    private readonly instagramApi: InstagramApi,
    private readonly settingsService: SettingsService,
  ) {}

  private async getRandomDelayFromSettings(): Promise<number> {
    const setting = await this.settingsService.getGlobalSettings()
    return Math.floor(Math.random() * (setting.maxDelay - setting.minDelay + 1)) + setting.minDelay
  }

  @Post('export-sample-xlsx')
  async exportSampleXlsx(@Res() res: Response) {
    // 샘플 데이터 생성
    const sampleRows = [
      {
        유저명: '홍길동',
        유저ID: 'hong_gildong',
        '프로필 링크': 'https://instagram.com/hong_gildong',
        DM: '안녕하세요! 제품에 관심이 있으시면 연락주세요.',
      },
      {
        유저명: '김철수',
        유저ID: 'kim_chulsoo',
        '프로필 링크': 'https://instagram.com/kim_chulsoo',
        DM: '좋은 하루 되세요!',
      },
      {
        유저명: '이영희',
        유저ID: 'lee_younghee',
        '프로필 링크': 'https://instagram.com/lee_younghee',
        DM: '팔로우 감사합니다.',
      },
      {
        유저명: '박민수',
        유저ID: 'park_minsoo',
        '프로필 링크': 'https://instagram.com/park_minsoo',
        DM: '',
      },
      {
        유저명: '최지은',
        유저ID: 'choi_jieun',
        '프로필 링크': 'https://instagram.com/choi_jieun',
        DM: '새로운 소식이 있으면 공유드릴게요!',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: ['유저명', '유저ID', '프로필 링크', 'DM'] })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="sample_dm_template.xlsx"')
    res.send(buffer)
  }

  @Post('export-posts-xlsx')
  async exportPostsToXlsx(@Body() dto: WorkflowExportXlsxDto, @Res() res: Response) {
    const setting = await this.settingsService.getGlobalSettings()
    let igId: string | undefined, igPw: string | undefined
    igId = setting?.loginId
    igPw = setting?.loginPassword
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
    const globalSettings = await this.settingsService.getGlobalSettings()
    if (!globalSettings.loginId || !globalSettings.loginPassword) {
      throw new HttpException('인스타그램 로그인 정보(아이디/비밀번호)가 필요합니다.', HttpStatus.BAD_REQUEST)
    }
    await this.instagramApi.login(globalSettings.loginId, globalSettings.loginPassword)
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    if (!rows.length) {
      throw new HttpException('엑셀 데이터가 비어있습니다.', HttpStatus.BAD_REQUEST)
    }
    const results = []
    for (const row of rows) {
      const { 유저ID, DM, 유저명 } = row as any
      let dmResult = null
      const dmMessage = typeof DM === 'string' ? DM : DM ? String(DM) : ''
      try {
        if (dmMessage) {
          dmResult = await this.instagramApi.sendDm(유저ID, dmMessage)
          if (!dmResult) {
            throw new Error('등록할 수 없음')
          }
          await sleep(await this.getRandomDelayFromSettings())
        } else {
          throw new Error('DM 메시지를 입력하세요.')
        }
      } catch (error) {
        dmResult = { error: error.message }
      }
      results.push({ 유저ID, 유저명, dmResult })
    }
    try {
      res.json({ success: true, results })
    } catch (error) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, error: error.message || '알 수 없는 오류가 발생했습니다.' })
    }
  }
}
