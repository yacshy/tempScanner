import { Injectable } from '@nestjs/common';
import { Scanner, type ScannerResultZip } from '../scanner/scanner';

@Injectable()
export class ScanService {
  async scanArea(radarOption: {
    lon: number;
    lat: number;
    radius: number;
  }): Promise<ScannerResultZip> {
    const scanner = new Scanner(radarOption);
    await scanner.initialize();
    const result = scanner.starScan();
    return result;
  }
}
