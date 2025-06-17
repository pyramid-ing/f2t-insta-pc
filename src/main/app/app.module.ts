import { join } from 'node:path'
import { ElectronModule } from '@doubleshot/nest-electron'
import customConfig from '@main/app/config/custom-config'
import { InstagramModule } from '@main/app/modules/instagram/instagram.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'
import { PrismaService } from '@main/app/shared/prisma.service'
import { GlobalExceptionFilter } from '@main/filters/global-exception.filter'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core'
import { app, BrowserWindow } from 'electron'

@Module({
  imports: [
    ElectronModule.registerAsync({
      useFactory: async () => {
        const isDev = !app.isPackaged
        const win = new BrowserWindow({
          width: 1024,
          height: 768,
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.cjs'),
          },
        })

        win.on('closed', () => {
          win.destroy()
        })

        const URL = isDev
          ? process.env.DS_RENDERER_URL
          : `file://${join(app.getAppPath(), 'dist/render/index.html')}`

        win.loadURL(URL)

        return { win }
      },
    }),
    ConfigModule.forRoot({
      load: [customConfig],
      isGlobal: true,
    }),
    SettingsModule,
    InstagramModule,
  ],
  providers: [
    {
      // 의존성 주입이 가능하도록 module에도 설정해준다.
      provide: APP_FILTER,
      useFactory: (httpAdapter: HttpAdapterHost) => {
        return new GlobalExceptionFilter(httpAdapter)
      },
      inject: [HttpAdapterHost],
    },
    PrismaService,
  ],
  controllers: [],
})
export class AppModule {}
