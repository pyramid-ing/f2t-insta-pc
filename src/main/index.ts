import { AppModule } from '@main/app/app.module'
import { EnvConfig } from '@main/config/env.config'
import { LoggerConfig } from '@main/config/logger.config'
import { environment } from '@main/environments/environment'
import { GlobalExceptionFilter } from '@main/filters/global-exception.filter'
import { BadRequestException, type ValidationError, ValidationPipe } from '@nestjs/common'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import * as bodyParser from 'body-parser'
import { app, ipcMain, shell } from 'electron'
import { WinstonModule } from 'nest-winston'
import { utilities as nestWinstonModuleUtilities } from 'nest-winston/dist/winston.utilities'
import winston from 'winston'

EnvConfig.initialize()
LoggerConfig.info(process.env.NODE_ENV)
LoggerConfig.info(process.env.PRISMA_QUERY_ENGINE_BINARY)
LoggerConfig.info(process.env.PRISMA_QUERY_ENGINE_LIBRARY)
LoggerConfig.info(process.env.PUPPETEER_EXECUTABLE_PATH)
LoggerConfig.info(process.env.COOKIE_DIR)

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// IPC 핸들러 설정
function setupIpcHandlers() {
  ipcMain.handle('get-backend-port', () => 3553)
  ipcMain.handle('open-external', async (_, url) => {
    await shell.openExternal(url)
  })
}

async function electronAppInit() {
  const isDev = !app.isPackaged
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  if (isDev) {
    if (process.platform === 'win32') {
      process.on('message', data => {
        if (data === 'graceful-exit') app.quit()
      })
    } else {
      process.on('SIGTERM', () => {
        app.quit()
      })
    }
  }

  await app.whenReady()
  setupIpcHandlers()
}

async function bootstrap() {
  try {
    await electronAppInit()

    const instance = winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('ITB', {
              colors: true,
              prettyPrint: true,
            }),
          ),
          level: environment.production ? 'info' : 'silly',
        }),
      ],
    })

    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger({
        instance,
      }),
    })

    app.enableCors()
    // app.enableVersioning({
    //   defaultVersion: '1',
    //   type: VersioningType.URI,
    // })
    // app.setGlobalPrefix('api', { exclude: ['sitemap.xml'] })
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        exceptionFactory: (validationErrors: ValidationError[] = []) => {
          console.error(JSON.stringify(validationErrors))
          return new BadRequestException(validationErrors)
        },
      }),
    )

    const httpAdapter = app.get(HttpAdapterHost)
    app.useGlobalFilters(new GlobalExceptionFilter(httpAdapter)) // HttpAdapterHost 주입

    // Support 10mb csv/json files for importing activities
    app.use(bodyParser.json({ limit: '10mb' }))

    await app.listen(3553)

    console.log('NestJS HTTP server is running on port 3553')
  } catch (error) {
    console.log(error)
    app.quit()
  }
}

bootstrap()
