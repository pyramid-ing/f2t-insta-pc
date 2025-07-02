import { InstagramController } from '@main/app/modules/instagram/api/instagram.controller'
import { UtilModule } from '@main/app/modules/util/util.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InstagramApi } from './instagram-api'

@Module({
  imports: [ConfigModule, UtilModule],
  controllers: [InstagramController],
  providers: [InstagramApi],
  exports: [InstagramApi],
})
export class InstagramApiModule {}
