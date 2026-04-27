import { Injectable } from '@nestjs/common';
import { Scanner } from '../scanner/scanner';

export type GeoJson = [number, number][];

@Injectable()
export class ScanService {
  async scanArea(radarOption: {
    lon: number;
    lat: number;
    radius: number;
  }): Promise<Array<GeoJson>> {
    const scanner = new Scanner(radarOption);
    await scanner.initialize();
    const result = scanner.starScan();
    return result.map((coords) => {
      return [...coords, coords[0]];
    });
  }
}
