import * as geolib from 'geolib';
import { fromFile } from 'geotiff';
import type { GeoTIFFImage, GeoTIFF, TypedArray } from 'geotiff';
import path from 'path';
import type { GeoKeyName } from 'node_modules/geotiff/dist-module/globals.js';

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

export class ScannerAlpha {
  elevationData: TypedArray;
  boundry: [number, number][][];
  radar: {
    lon: number;
    lat: number;
    radius: number;
    elevation: number;
  };
  width: number;
  height: number;
  window: [number, number, number, number];
  arcoSize: number;
  stepSize: number;
  geoTransform: number[];

  tiff: GeoTIFF;
  image: GeoTIFFImage;
  tiePoints: Array<{
    i: number;
    j: number;
    k: number;
    x: number;
    y: number;
    z: number;
  }>;
  resolution: number[];
  origin: number[];
  geoKeys: Partial<Record<GeoKeyName, any>> | null;

  constructor(radarOption: { lon: number; lat: number; radius: number }) {
    this.radar = {
      ...radarOption,
      elevation: 0,
    };
    this.arcoSize = 360 * 2;
    this.stepSize = 90;
  }

  async initialize() {
    const { lon, lat, radius } = this.radar;
    this.boundry = this.computeRadarBoundary(lon, lat, radius, this.arcoSize);

    this.tiff = await fromFile(path.join(__dirname, '../../assets/demo90.tif'));
    this.image = await this.tiff.getImage();
    this.tiePoints = await this.image.getTiePoints();

    this.width = this.image.getWidth();
    this.height = this.image.getHeight();
    this.resolution = this.image.getResolution();
    this.origin = this.image.getOrigin();
    this.geoKeys = this.image.getGeoKeys();

    const modelPixelScale =
      this.image.fileDirectory.getValue('ModelPixelScale');

    if (this.tiePoints && this.tiePoints.length > 0) {
      const tiePoint = this.tiePoints[0];
      let pixelScaleX: number, pixelScaleY: number;
      if (modelPixelScale) {
        pixelScaleX = modelPixelScale[0];
        pixelScaleY = modelPixelScale[1];
      } else {
        pixelScaleX = this.resolution[0];
        pixelScaleY = Math.abs(this.resolution[1]);
      }

      this.geoTransform = [
        tiePoint.x,
        pixelScaleX,
        0,
        tiePoint.y,
        0,
        -pixelScaleY,
      ];
    } else {
      this.geoTransform = [
        this.origin[0],
        this.resolution[0],
        0,
        this.origin[1],
        0,
        -Math.abs(this.resolution[1]),
      ];
    }

    const window = [0, 0, this.width, this.height] as [
      number,
      number,
      number,
      number,
    ];
    // this.computeWindow(this.radar);
    console.log('window: ', window);
    // 读取整个影像的栅格数据
    const rasters = await this.tiff.readRasters({ window });
    this.window = window;
    // 对于单波段高程数据，直接取第一个数组
    this.elevationData = rasters[0] as TypedArray;
    const [x, y] = this.lonLatToPixel(lon, lat);
    this.radar.elevation = this.getElevationByPixel(x, y);
    console.log('this.radar.elevation: ', this);
    throw new Error('elevation is 0');
  }

  starScan(): ScannerResultZip {
    const lines = this.boundry.map((_, index) =>
      this.computeBoundryOfLine((index * 360) / this.boundry.length),
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
    const [originX, pixelSizeX, , originY, , pixelSizeY] = this.geoTransform;
    const pixelX = (lon - originX) / pixelSizeX;
    const pixelY = (lat - originY) / pixelSizeY;
    return [pixelX, pixelY];
  }

  pixelToLonLat(x: number, y: number) {
    const [originX, pixelSizeX, , originY, , pixelSizeY] = this.geoTransform;
    const lon = originX + x * pixelSizeX;
    const lat = originY + y * pixelSizeY;
    return [lon, lat];
  }

  getElevationBilinear(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const q11 = this.getElevationByPixel(x0, y0);
    const q21 = this.getElevationByPixel(x1, y0);
    const q12 = this.getElevationByPixel(x0, y1);
    const q22 = this.getElevationByPixel(x1, y1);

    const dx = x - x0;
    const dy = y - y0;

    return (
      q11 * (1 - dx) * (1 - dy) +
      q21 * dx * (1 - dy) +
      q12 * (1 - dx) * dy +
      q22 * dx * dy
    );
  }

  getElevationByPixel(x: number, y: number): number {
    const idx = Math.floor(y * this.width + x);
    const res = this.elevationData[idx];
    if (idx > this.elevationData.length || !res) {
      console.log({
        idx,
        y,
        width: this.width,
        height: this.height,
        x,
        adL: this.elevationData.length,
      });
      return 0;
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

  computeBoundryOfLine(bearing: number): [number, number][] {
    const { lon, lat, radius, elevation } = this.radar;

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

    return [distance_3k, distance_5k, distance_8k, distance_10k].map((d) => {
      const { longitude, latitude } = geolib.computeDestinationPoint(
        { longitude: lon, latitude: lat },
        d,
        bearing,
      );
      return [longitude, latitude];
    });
  }
}
