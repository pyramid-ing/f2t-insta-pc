import { InstagramApi } from '@main/app/modules/instagram/api/instagram-api'
import { Controller } from '@nestjs/common'

@Controller()
export class InstagramController {
  constructor(private readonly instagramApi: InstagramApi) {}
}
