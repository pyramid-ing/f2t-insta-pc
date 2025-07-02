import { CookieService } from '@main/app/modules/util/cookie.service'
import { Module } from '@nestjs/common'
import { UtilService } from './util.service'

@Module({
  imports: [],
  providers: [UtilService, CookieService],
  exports: [UtilService, CookieService],
})
export class UtilModule {}
