import { SettingsService } from '@main/app/modules/settings/settings.service'
import { Module } from '@nestjs/common'
import { SettingsController } from 'src/main/app/modules/settings/settings.controller'
import { PrismaService } from 'src/main/app/shared/prisma.service'

@Module({
  providers: [PrismaService, SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
