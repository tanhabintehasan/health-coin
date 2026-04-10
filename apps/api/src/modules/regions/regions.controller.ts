import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RegionsService } from './regions.service';

@ApiTags('Regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Get all provinces' })
  getProvinces() {
    return this.regionsService.getProvinces();
  }

  @Get('provinces/:id/cities')
  @ApiOperation({ summary: 'Get cities under a province' })
  getCities(@Param('id') id: string) {
    return this.regionsService.getCities(id);
  }

  @Get('cities/:id/counties')
  @ApiOperation({ summary: 'Get counties under a city' })
  getCounties(@Param('id') id: string) {
    return this.regionsService.getCounties(id);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full region tree' })
  getTree() {
    return this.regionsService.getTree();
  }
}
