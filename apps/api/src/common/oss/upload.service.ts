import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OSS from 'ali-oss';
import { extname, join } from 'path';
import { nanoid } from 'nanoid';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private client: OSS | null = null;
  private localUploadDir: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get('OSS_REGION');
    const accessKeyId = this.config.get('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.config.get('OSS_ACCESS_KEY_SECRET');
    const bucket = this.config.get('OSS_BUCKET');
    const endpoint = this.config.get('OSS_ENDPOINT');

    if (region && accessKeyId && accessKeySecret && bucket) {
      this.client = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket,
        endpoint: endpoint || undefined,
        secure: true,
      });
    } else {
      this.logger.warn('OSS not fully configured. Using local file storage for uploads.');
    }

    this.localUploadDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Buffer, originalName: string, mimetype: string): Promise<string> {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const allowedDocExts = ['.pdf', '.doc', '.docx'];
    const allowed = [...allowedImageExts, ...allowedDocExts];

    if (!allowed.includes(ext)) {
      throw new BadRequestException(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`);
    }

    const filename = `${Date.now()}_${nanoid(8)}${ext}`;

    if (this.client) {
      const key = `uploads/${filename}`;
      try {
        const result = await this.client.put(key, file, {
          headers: { 'Content-Type': mimetype || 'application/octet-stream' },
        });
        return result.url;
      } catch (err: any) {
        this.logger.error(`OSS upload failed: ${err.message}`);
        throw new BadRequestException('File upload failed. Please check OSS configuration.');
      }
    }

    // Local file storage fallback
    const filePath = join(this.localUploadDir, filename);
    fs.writeFileSync(filePath, file);

    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    return `${appUrl}/api/v1/uploads/${filename}`;
  }

  getLocalFilePath(filename: string): string {
    return join(this.localUploadDir, filename);
  }
}
