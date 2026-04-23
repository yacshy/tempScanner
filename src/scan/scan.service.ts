import { Injectable } from '@nestjs/common';
import { Scanner } from '../scanner/scanner';

export interface GeoJson {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, any>;
    geometry: {
      type: 'Polygon';
      coordinates: [number, number][][];
    };
  }>;
}

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
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[...coords, coords[0]]],
            },
          },
        ],
      };
    });
  }
}
