import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InstagramController } from './instagram.controller'
import { InstagramApi } from './instagram-api'

@Module({
  imports: [ConfigModule],
  controllers: [InstagramController],
  providers: [InstagramApi],
  exports: [InstagramApi],
})
export class InstagramApiModule {}
