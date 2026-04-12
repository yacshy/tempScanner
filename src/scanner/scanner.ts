import * as geolib from 'geolib';
import { fromFile, TypedArray } from 'geotiff';
import path from 'path';

export interface ScannerResult {
  slope: number;
  lonlat: [number, number];
}

export type ScannerResultZip = [
  [number, number][],
  [number, number][],
  [number, number][],
  [number, number][],
];

export class Scanner {
  elevationData: TypedArray;
  boundry: [number, number][][];
  radar: {
    lon: number;
    lat: number;
    radius: number;
    elevation: number;
  };
  window: [number, number, number, number];

  constructor(radarOption: { lon: number; lat: number; radius: number }) {
    this.radar = {
      ...radarOption,
      elevation: 0,
    };
  }

  async initialize() {
    const { lon, lat, radius } = this.radar;
    this.boundry = this.computeRadarBoundary(lon, lat, radius, 360 * 1);

    const image = await fromFile(
      path.join(__dirname, '../../assets/demo30.tif'),
    );
    const window = this.computeWindow(this.radar);
    console.log('window: ', window);
    // 读取整个影像的栅格数据
    const rasters = await image.readRasters({ window });
    this.window = window;
    // 对于单波段高程数据，直接取第一个数组
    this.elevationData = rasters[0] as TypedArray;
    const [x, y] = this.lonLatToPixel(lon, lat);
    this.radar.elevation = this.getElevationByPixel(x, y);
  }

  starScan(): ScannerResultZip {
    const lines = this.boundry.map((item, index) =>
      this.computeBoundryOfLine(item, (index * 360) / this.boundry.length),
    );
    const result: ScannerResultZip = [[], [], [], []];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const lonlat_3k = line[0].lonlat;
      const lonlat_5k = line[1].lonlat;
      const lonlat_8k = line[2].lonlat;
      const lonlat_10k = line[3].lonlat;
      result[0].push(lonlat_3k);
      result[1].push(lonlat_5k);
      result[2].push(lonlat_8k);
      result[3].push(lonlat_10k);
    }
    return result;
  }

  private transform = {
    scaleX: 0.0054931641,
    scaleY: -0.0054931641,
    tieX: -180,
    tieY: 90,
  };

  computeRadarBoundary(
    lon: number,
    lat: number,
    radius: number,
    steps = 360,
  ): [number, number][][] {
    const R = 6378137; // 地球半径（米）

    const calcLoncLat = (r: number, bearing: number) => {
      const newLat = Math.asin(
        Math.sin(latRad) * Math.cos(r / R) +
          Math.cos(latRad) * Math.sin(r / R) * Math.cos(bearing),
      );

      const newLon =
        lonRad +
        Math.atan2(
          Math.sin(bearing) * Math.sin(r / R) * Math.cos(latRad),
          Math.cos(r / R) - Math.sin(latRad) * Math.sin(newLat),
        );
      return [newLon, newLat];
    };

    const result: [number, number][][] = [];

    const lonRad = (lon * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;

    for (let i = 0; i < steps; i++) {
      const bearing = (i * Math.PI * 2) / steps;
      const [newLon_max, newLat_max] = calcLoncLat(radius, bearing);
      const [newLon_3k, newLat_3k] = calcLoncLat(3000, bearing);
      const [newLon_5k, newLat_5k] = calcLoncLat(5000, bearing);
      const [newLon_8k, newLat_8k] = calcLoncLat(8000, bearing);
      const [newLon_10k, newLat_10k] = calcLoncLat(10000, bearing);
      result.push([
        [(newLon_3k * 180) / Math.PI, (newLat_3k * 180) / Math.PI],
        [(newLon_5k * 180) / Math.PI, (newLat_5k * 180) / Math.PI],
        [(newLon_8k * 180) / Math.PI, (newLat_8k * 180) / Math.PI],
        [(newLon_10k * 180) / Math.PI, (newLat_10k * 180) / Math.PI],
        [(newLon_max * 180) / Math.PI, (newLat_max * 180) / Math.PI],
      ]);
    }

    return result;
  }

  lonLatToPixel(lon: number, lat: number) {
    const { scaleX, scaleY, tieX, tieY } = this.transform;

    const x = (lon - tieX) / scaleX;
    const y = (lat - tieY) / scaleY;
    return [x, y];
  }

  pixelToLonLat(x: number, y: number) {
    const { scaleX, scaleY, tieX, tieY } = this.transform;

    const lon = tieX + x * scaleX;
    const lat = tieY + y * scaleY;
    return [lon, lat];
  }

  getElevationByPixel(x: number, y: number): number {
    const width = this.window[2] - this.window[0];
    const index = x - this.window[0] + (y - this.window[1]) * width;
    const formatIndex = Math.floor(index);
    const res = this.elevationData[formatIndex];
    if (!res) {
      console.log('posi: ', y, x);
      console.log('width: ', width);
      console.log('res: ', res);
      console.log('index: ', index);
      console.log('formatIndex: ', formatIndex);
      throw new Error('index out of range');
    }
    return res;
  }

  computeWindow({
    lon,
    lat,
    radius,
  }: {
    lon: number;
    lat: number;
    radius: number;
  }): [number, number, number, number] {
    // window是雷达圆形范围的内接矩形，需要额外扩大window范围才能把雷达圆变成window矩形的内接圆，现在暂且简单地加上500px，实际需要根据半径计算
    // 计算最小外接矩形的四个顶点像素坐标
    const pixels = [0, 45, 90, 135, 180, 225, 270, 315]
      .map((bearing) => {
        return geolib.computeDestinationPoint(
          { longitude: lon, latitude: lat },
          radius,
          bearing,
        );
      })
      .map((lonlat) => {
        return this.lonLatToPixel(lonlat.longitude, lonlat.latitude).map((i) =>
          Math.floor(i),
        );
      });
    const x_max = Math.max(...pixels.map((item) => item[0]));
    const y_max = Math.max(...pixels.map((item) => item[1]));
    const x_min = Math.min(...pixels.map((item) => item[0]));
    const y_min = Math.min(...pixels.map((item) => item[1]));
    // 补偿值
    const compensation = 100;
    return [
      x_min - compensation,
      y_min - compensation,
      x_max + compensation,
      y_max + compensation,
    ];
  }

  computeBoundryOfLine(
    aim: [number, number][],
    bearing: number,
  ): [ScannerResult, ScannerResult, ScannerResult, ScannerResult] {
    const { lon, lat, radius, elevation } = this.radar;

    const [x_3k, y_3k] = this.lonLatToPixel(aim[0][0], aim[0][1]);
    const [x_5k, y_5k] = this.lonLatToPixel(aim[1][0], aim[1][1]);
    const [x_8k, y_8k] = this.lonLatToPixel(aim[2][0], aim[2][1]);
    const [x_10k, y_10k] = this.lonLatToPixel(aim[3][0], aim[3][1]);

    const elevation_3k = this.getElevationByPixel(x_3k, y_3k);
    const elevation_5k = this.getElevationByPixel(x_5k, y_5k);
    const elevation_8k = this.getElevationByPixel(x_8k, y_8k);
    const elevation_10k = this.getElevationByPixel(x_10k, y_10k);

    const slope_3k = (elevation_3k - elevation) / 3000;
    const slope_5k = (elevation_5k - elevation) / 5000;
    const slope_8k = (elevation_8k - elevation) / 8000;
    const slope_10k = (elevation_10k - elevation) / 10000;

    const result_3k = { slope: slope_3k, lonlat: aim[0] };
    const result_5k = { slope: slope_5k, lonlat: aim[1] };
    const result_8k = { slope: slope_8k, lonlat: aim[2] };
    const result_10k = { slope: slope_10k, lonlat: aim[3] };

    for (let distance = 0; distance <= radius; distance += 1000) {
      const { longitude, latitude } = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        distance,
        bearing,
      );
      const [x, y] = this.lonLatToPixel(longitude, latitude);
      const elevation_current = this.getElevationByPixel(x, y);
      const slope = (elevation_current - elevation) / distance;
      if (slope <= result_3k.slope && distance <= 3000) {
        result_3k.lonlat = [longitude, latitude];
        result_3k.slope = slope;
      }
      if (slope <= result_5k.slope && distance <= 5000) {
        result_5k.lonlat = [longitude, latitude];
        result_5k.slope = slope;
      }
      if (slope <= result_8k.slope && distance <= 8000) {
        result_8k.lonlat = [longitude, latitude];
        result_8k.slope = slope;
      }
      if (slope <= result_10k.slope && distance <= 10000) {
        result_10k.lonlat = [longitude, latitude];
        result_10k.slope = slope;
      }
    }

    return [result_3k, result_5k, result_8k, result_10k];
  }
}
