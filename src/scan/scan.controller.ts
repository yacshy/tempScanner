import { Body, Controller, Post } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanAreaRequestDto } from './dto/ScanAreaDto';

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('scan-area')
  async scanArea(@Body() radarOption: ScanAreaRequestDto): Promise<any> {
    return await this.scanService.scanArea(radarOption);
  }
}
