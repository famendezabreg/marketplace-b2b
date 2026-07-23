import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Carpeta local donde se guardan las imagenes subidas (evidencia de reclamos, ver
  // src/uploads/claim-evidence.storage.ts). No hay servicio de almacenamiento en la nube
  // en este proyecto -- la carpeta se crea sola al subir el primer archivo, y todo lo que
  // haya adentro se sirve como archivos estaticos bajo /uploads/*.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no declaradas en los DTOs
      forbidNonWhitelisted: true, // rechaza el request si vienen propiedades extra
      transform: true, // convierte payloads a instancias de las clases DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Necesario para que el decorador @Exclude() en User.password (y cualquier otro
  // campo marcado como excluido) realmente se aplique al serializar las respuestas.
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('API Marketplace B2B')
    .setDescription(
      'API para plataforma de marketplace B2B: catalogos, cotizaciones, ordenes y liquidacion de comisiones',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Aplicacion corriendo en http://localhost:${port}`);
  console.log(`Documentacion Swagger en http://localhost:${port}/api/docs`);
}
bootstrap();
