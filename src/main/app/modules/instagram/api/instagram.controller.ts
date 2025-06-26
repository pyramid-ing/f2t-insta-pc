import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common'
import { InstagramApi } from '@main/app/modules/instagram/api/instagram-api'

@Controller()
export class InstagramController {
  constructor(private readonly instagramApi: InstagramApi) {}

  @Post('verify-challenge')
  async verifyChallenge(@Body('username') username: string, @Body('code') code: string, @Res() res: Response) {
    try {
      const result = await this.instagramApi.verifyChallenge(username, code)
      res.json({ success: true, result })
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: error.message })
    }
  }
}
