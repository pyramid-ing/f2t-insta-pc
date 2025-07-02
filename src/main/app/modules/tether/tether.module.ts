import { Module } from '@nestjs/common'
import { TetherController } from './tether.controller'
import { TetherService } from './tether.service'

@Module({
  providers: [TetherService],
  controllers: [TetherController],
  exports: [TetherService],
})
export class TetherModule {}
