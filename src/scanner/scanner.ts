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
  arcoSize: number;
  stepSize: number;

  constructor(radarOption: { lon: number; lat: number; radius: number }) {
    this.radar = {
      ...radarOption,
      elevation: 0,
    };
    this.arcoSize = 360 * 2;
    this.stepSize = 500;
  }

  async initialize() {
    const { lon, lat, radius } = this.radar;
    this.boundry = this.computeRadarBoundary(lon, lat, radius, this.arcoSize);

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

      const lonlat_3k = line[0];
      const lonlat_5k = line[1];
      const lonlat_8k = line[2];
      const lonlat_10k = line[3];
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
    const result: [number, number][][] = [];

    for (let i = 0; i < steps; i++) {
      const bearing = (i * 360) / steps;
      const lonlta_3k = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        3000,
        bearing,
      );
      const lonlta_5k = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        5000,
        bearing,
      );
      const lonlta_8k = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        8000,
        bearing,
      );
      const lonlta_10k = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        10000,
        bearing,
      );
      const lonlta_max = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        radius,
        bearing,
      );
      result.push([
        [lonlta_3k.longitude, lonlta_3k.latitude],
        [lonlta_5k.longitude, lonlta_5k.latitude],
        [lonlta_8k.longitude, lonlta_8k.latitude],
        [lonlta_10k.longitude, lonlta_10k.latitude],
        [lonlta_max.longitude, lonlta_max.latitude],
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
      console.log(
        'index out of range: ',
        formatIndex - this.elevationData.length,
      );
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
    const pixels = Array.from({ length: this.arcoSize })
      .map((_, index) => {
        const bearing = (index * 360) / this.arcoSize;
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

    let x_max = -Infinity;
    let y_max = -Infinity;
    let x_min = Infinity;
    let y_min = Infinity;

    for (let i = 0; i < pixels.length; i++) {
      const [x, y] = pixels[i];
      x_max = Math.max(x_max, x);
      y_max = Math.max(y_max, y);
      x_min = Math.min(x_min, x);
      y_min = Math.min(y_min, y);
    }
    // 补偿值
    const compensation = 500;
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
  ): [number, number][] {
    const { lon, lat, radius, elevation } = this.radar;

    // const [x_3k, y_3k] = this.lonLatToPixel(aim[0][0], aim[0][1]);
    // const [x_5k, y_5k] = this.lonLatToPixel(aim[1][0], aim[1][1]);
    // const [x_8k, y_8k] = this.lonLatToPixel(aim[2][0], aim[2][1]);
    // const [x_10k, y_10k] = this.lonLatToPixel(aim[3][0], aim[3][1]);

    // const elevation_3k = this.getElevationByPixel(x_3k, y_3k);
    // const elevation_5k = this.getElevationByPixel(x_5k, y_5k);
    // const elevation_8k = this.getElevationByPixel(x_8k, y_8k);
    // const elevation_10k = this.getElevationByPixel(x_10k, y_10k);

    const max_distance_3k = Math.sqrt(radius ** 2 - (3000 - elevation) ** 2);
    const max_distance_5k = Math.sqrt(radius ** 2 - (5000 - elevation) ** 2);
    const max_distance_8k = Math.sqrt(radius ** 2 - (8000 - elevation) ** 2);
    const max_distance_10k = Math.sqrt(radius ** 2 - (10000 - elevation) ** 2);

    let slope_3k = (3000 - elevation) / max_distance_3k;
    let slope_5k = (5000 - elevation) / max_distance_5k;
    let slope_8k = (8000 - elevation) / max_distance_8k;
    let slope_10k = (10000 - elevation) / max_distance_10k;

    for (
      let distance = this.stepSize;
      distance <= radius;
      distance += this.stepSize
    ) {
      const { longitude, latitude } = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        distance,
        bearing,
      );
      const [x, y] = this.lonLatToPixel(longitude, latitude);
      const elevation_current = this.getElevationByPixel(x, y);
      const slope = (elevation_current - elevation) / distance;
      if (slope > slope_3k && distance <= max_distance_3k) {
        slope_3k = slope;
      }
      if (slope > slope_5k && distance <= max_distance_5k) {
        slope_5k = slope;
      }
      if (slope > slope_8k && distance <= max_distance_8k) {
        slope_8k = slope;
      }
      if (slope > slope_10k && distance <= max_distance_10k) {
        slope_10k = slope;
      }
    }

    const distance_3k = (3000 - elevation) / slope_3k;
    const distance_5k = (5000 - elevation) / slope_5k;
    const distance_8k = (8000 - elevation) / slope_8k;
    const distance_10k = (10000 - elevation) / slope_10k;

    const lonlat_3k = geolib.computeDestinationPoint(
      { longitude: lon, latitude: lat },
      distance_3k,
      bearing,
    );
    const lonlat_5k = geolib.computeDestinationPoint(
      { longitude: lon, latitude: lat },
      distance_5k,
      bearing,
    );
    const lonlat_8k = geolib.computeDestinationPoint(
      { longitude: lon, latitude: lat },
      distance_8k,
      bearing,
    );
    const lonlat_10k = geolib.computeDestinationPoint(
      { longitude: lon, latitude: lat },
      distance_10k,
      bearing,
    );

    const result_3k = [lonlat_3k.longitude, lonlat_3k.latitude] as [
      number,
      number,
    ];
    const result_5k = [lonlat_5k.longitude, lonlat_5k.latitude] as [
      number,
      number,
    ];
    const result_8k = [lonlat_8k.longitude, lonlat_8k.latitude] as [
      number,
      number,
    ];
    const result_10k = [lonlat_10k.longitude, lonlat_10k.latitude] as [
      number,
      number,
    ];

    return [result_3k, result_5k, result_8k, result_10k];
  }
}
