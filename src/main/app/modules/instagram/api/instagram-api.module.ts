import { InstagramController } from '@main/app/modules/instagram/api/instagram.controller'
import { CookieService } from '@main/app/modules/util/cookie.service'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InstagramApi } from './instagram-api'

@Module({
  imports: [ConfigModule],
  controllers: [InstagramController],
  providers: [InstagramApi, CookieService],
  exports: [InstagramApi],
})
export class InstagramApiModule {}
