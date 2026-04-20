import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { extname } from 'path';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadService: UploadService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Serve a locally uploaded file' })
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadService.getLocalFilePath(filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ statusCode: 404, message: 'File not found on disk' });
    }

    const ext = extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  }
}
