import { Injectable } from '@nestjs/common';
import { ScannerAlpha } from '../scan-alpha/scan-alpha';
import { GeoJson } from '@/scan/scan.service';

@Injectable()
export class SimpleScanService {
  async scanArea(radarOption: {
    lon: number;
    lat: number;
    radius: number;
  }): Promise<Array<GeoJson>> {
    const scanner = new ScannerAlpha(radarOption);
    await scanner.initialize();
    const result = scanner.starScan();
    return result.map((coords) => {
      return [...coords, coords[0]];
    });
  }
}
