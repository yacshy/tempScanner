# Scanner 项目

## 项目描述

Scanner 是一个基于 NestJS 框架的后端服务，用于扫描指定区域的地形并计算不同距离的坡度。该服务通过地理坐标和半径参数，分析指定区域内的地形起伏情况，为用户提供地形坡度数据。

## 核心功能

- 扫描指定地理区域的地形
- 计算不同距离（3km、5km、8km、10km）的坡度
- 基于 GeoTIFF 高程数据进行地形分析
- 提供 RESTful API 接口
- 双线性插值获取高程数据
- 经纬度与像素坐标相互转换

## 技术栈

- **框架**: NestJS
- **语言**: TypeScript
- **地理计算**: geolib
- **高程数据处理**: geotiff

## 项目结构

```
scanner/
├── assets/                # 静态资源
│   └── demo30.tif         # 高程数据文件
├── src/
│   ├── scan/              # 扫描相关模块
│   │   ├── dto/           # 数据传输对象
│   │   │   └── ScanAreaDto.ts
│   │   ├── scan.controller.ts
│   │   ├── scan.service.ts
│   │   └── scan.module.ts
│   ├── scan-alpha/        # 核心扫描逻辑（Alpha 版本）
│   │   └── scan-alpha.ts  # 扫描器实现
│   ├── app.module.ts      # 应用主模块
│   └── main.ts            # 应用入口
├── package.json           # 项目配置
└── README.md              # 项目文档
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 运行项目

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run start:prod
```

### 构建项目

```bash
pnpm run build
```

## 核心类 - ScannerAlpha

### 构造函数

```typescript
constructor(radarOption: { lon: number; lat: number; radius: number })
```

- **参数**:
  - `lon`: 雷达中心经度
  - `lat`: 雷达中心纬度
  - `radius`: 扫描半径（米）

### 主要方法

#### initialize()

```typescript
async initialize(): Promise<void>
```

- **功能**: 初始化扫描器，读取高程数据
- **流程**:
  1. 计算雷达边界
  2. 读取 GeoTIFF 文件中的高程数据
  3. 计算扫描窗口
  4. 获取雷达中心的高程
  5. 计算不同距离的最大水平距离

#### starScan()

```typescript
starScan(): ScannerResultZip
```

- **功能**: 开始扫描，返回不同距离的结果
- **返回值**: `ScannerResultZip` 类型，包含四个距离（3km、5km、8km、10km）的扫描结果

#### getElevationByPixel(x: number, y: number)

```typescript
getElevationByPixel(x: number, y: number): number
```

- **功能**: 根据像素坐标获取高程数据
- **参数**:
  - `x`: 像素 x 坐标
  - `y`: 像素 y 坐标
- **返回值**: 高程值
- **异常**: 当索引超出范围时，抛出 "index out of range" 错误

#### getElevationBilinear(x: number, y: number)

```typescript
getElevationBilinear(x: number, y: number): number
```

- **功能**: 使用双线性插值获取高程数据
- **参数**:
  - `x`: 像素 x 坐标
  - `y`: 像素 y 坐标
- **返回值**: 插值后的高程值

#### lonLatToPixel(lon: number, lat: number)

```typescript
lonLatToPixel(lon: number, lat: number): [number, number]
```

- **功能**: 将经纬度转换为像素坐标
- **参数**:
  - `lon`: 经度
  - `lat`: 纬度
- **返回值**: 像素坐标 [x, y]

#### pixelToLonLat(x: number, y: number)

```typescript
pixelToLonLat(x: number, y: number): [number, number]
```

- **功能**: 将像素坐标转换为经纬度
- **参数**:
  - `x`: 像素 x 坐标
  - `y`: 像素 y 坐标
- **返回值**: 经纬度 [lon, lat]

#### computeWindow(radar: { lon: number; lat: number; radius: number })

```typescript
computeWindow({ lon, lat, radius }: { lon: number; lat: number; radius: number }): [number, number, number, number]
```

- **功能**: 计算扫描窗口
- **参数**:
  - `lon`: 雷达中心经度
  - `lat`: 雷达中心纬度
  - `radius`: 扫描半径（米）
- **返回值**: 窗口坐标 [xmin, ymin, xmax, ymax]

## API 接口

### 扫描区域

- **接口**: `POST /scan/scan-area`
- **参数**:
  ```json
  {
    "lon": 116.3974, // 经度
    "lat": 39.9093, // 纬度
    "radius": 10000 // 扫描半径（米）
  }
  ```
- **返回值**:
  ```json
  [
    [
      [116.3974, 39.9093],
      [116.4074, 39.9193],
      [116.4174, 39.9293],
      [116.4274, 39.9393]
    ],
    [
      [116.3874, 39.8993],
      [116.3774, 39.8893],
      [116.3674, 39.8793],
      [116.3574, 39.8693]
    ]
    // 更多方向的数据...
  ]
  ```

## 工作原理

1. **接收扫描请求**: 接收包含经度、纬度和半径的请求
2. **初始化扫描器**: 创建 ScannerAlpha 实例并调用 initialize() 方法
3. **计算雷达边界**: 根据给定的半径和方向计算扫描边界
4. **读取高程数据**: 从 GeoTIFF 文件中读取指定区域的高程数据
5. **计算坡度**: 分析不同距离处的地形坡度
6. **返回结果**: 将计算结果以 JSON 格式返回

## 错误处理

- **index out of range**: 当像素坐标超出高程数据范围时抛出此错误
- **初始化错误**: 当读取高程数据失败时可能抛出错误

## 测试

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
```

## docker 指令

```bash
# 加入docker
wsl -d Ubuntu

# 停止正在运行镜像的容器
sudo docker stop 7404f63d1e93

# 删除运行镜像的容器
sudo docker rm 7404f63d1e93

# 删除所有镜像
sudo docker rmi -f $(sudo docker images -q)

# 删除镜像
sudo docker image rm yacshy-366:arm64-1.0.0

# 查看镜像
sudo docker images

# 查找镜像
sudo docker ps -a | grep yacshy-366

# 构建 docker 镜像
sudo docker buildx build --platform linux/arm64 -t yacshy-366:arm64-1.0.0 --load .

# 保存镜像
sudo docker save yacshy-366:arm64-1.0.0 -o ../yacshy-366_arm64-1.0.0.tar

# 启动 docker 容器
docker run --platform linux/arm64 -p 3000:9527 -v /mnt/c/_Backend/assets/demo30.tif:/app/assets/demo30.tif yacshy-366:arm64-1.0.0
```

## 许可证

UNLICENSED
