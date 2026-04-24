import { Controller, Post, Body } from '@nestjs/common';
import { SimpleScanService } from './simple-scan.service';
import { ScanAreaRequestDto } from '@/scan/dto/ScanAreaDto';
import { GeoJson } from '@/scan/scan.service';

@Controller('simple-scan')
export class SimpleScanController {
  constructor(private readonly simpleScanService: SimpleScanService) {}

  @Post('scan-area')
  async scanArea(
    @Body() radarOption: ScanAreaRequestDto,
  ): Promise<Array<GeoJson>> {
    return await this.simpleScanService.scanArea(radarOption);
  }
}
