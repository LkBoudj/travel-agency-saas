import { INestApplication, VersioningType } from '@nestjs/common';
import { StandardSchemaValidationPipe } from '@nestjs/common/pipes/standard-schema-validation.pipe';

export function configureApp(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}