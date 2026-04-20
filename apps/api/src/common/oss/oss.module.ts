import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [ConfigModule],
  providers: [UploadService],
  controllers: [UploadController, UploadsController],
  exports: [UploadService],
})
export class OssModule {}
