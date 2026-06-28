import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Validation automatique des DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Supprime les champs non déclarés
    forbidNonWhitelisted: true,
    transform: true,        // Transforme les types automatiquement
  }))

  // CORS (pour le frontend)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  })

  // Préfixe global des routes
  app.setGlobalPrefix('api/v1')

  // Documentation Swagger
  const config = new DocumentBuilder()
    .setTitle('SafeChild Africa API')
    .setDescription('API de protection des enfants')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT || 3000
  await app.listen(port)

  console.log(`🚀 SafeChild API démarrée sur http://localhost:${port}`)
  console.log(`📚 Swagger docs : http://localhost:${port}/api/docs`)
}

bootstrap()