import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, fileUrl: string, fileType: string, fileName: string) {
    return this.prisma.healthRecord.create({
      data: { userId, fileUrl, fileType, fileName },
    });
  }

  async list(userId: string) {
    return this.prisma.healthRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string, recordId: string) {
    const record = await this.prisma.healthRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Health record not found');
    if (record.userId !== userId) throw new ForbiddenException('Not your record');

    await this.prisma.healthRecord.delete({ where: { id: recordId } });
    return { success: true };
  }
}
