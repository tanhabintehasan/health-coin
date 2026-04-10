import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HealthRecordsService } from './health-records.service';

class CreateHealthRecordDto {
  @ApiProperty({ description: 'OSS URL of the uploaded file' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ enum: ['image', 'pdf'] })
  @IsIn(['image', 'pdf'])
  fileType: string;

  @ApiProperty()
  @IsString()
  fileName: string;
}

@ApiTags('Health Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a health record (after OSS direct upload)' })
  create(@Request() req: any, @Body() dto: CreateHealthRecordDto) {
    return this.service.create(req.user.id, dto.fileUrl, dto.fileType, dto.fileName);
  }

  @Get()
  @ApiOperation({ summary: 'List my health records' })
  list(@Request() req: any) {
    return this.service.list(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a health record' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.id, id);
  }
}
