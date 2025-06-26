import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InstagramController } from './instagram.controller'
import { InstagramApi } from './instagram-api'
import { CookieService } from '@main/app/utils/cookie.service'

@Module({
  imports: [ConfigModule],
  controllers: [InstagramController],
  providers: [InstagramApi, CookieService],
  exports: [InstagramApi],
})
export class InstagramApiModule {}
