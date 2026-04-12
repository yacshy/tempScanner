# Scanner 项目

## 项目描述

Scanner 是一个基于 NestJS 框架的后端服务，用于扫描指定区域的地形并计算不同距离的坡度。该服务通过地理坐标和半径参数，分析指定区域内的地形起伏情况，为用户提供地形坡度数据。

## 核心功能

- 扫描指定地理区域的地形
- 计算不同距离（3km、5km、8km、10km）的坡度
- 基于 GeoTIFF 高程数据进行地形分析
- 提供 RESTful API 接口

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
│   ├── scanner/           # 核心扫描逻辑
│   │   ├── scanner.ts     # 扫描器实现
│   │   └── scanner.spec.ts
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

## API 接口

### 扫描区域

- **接口**: `POST /scan/scan-area`
- **参数**:
  ```json
  {
    "lon": 116.3974,     // 经度
    "lat": 39.9093,      // 纬度
    "radius": 10000      // 扫描半径（米）
  }
  ```
- **返回值**:
  ```json
  [
    [
      {
        "slope": 0.001,   // 3km 处的坡度
        "lonlat": [116.3974, 39.9093]  // 坐标
      },
      {
        "slope": 0.002,   // 5km 处的坡度
        "lonlat": [116.3974, 39.9093]
      },
      {
        "slope": 0.003,   // 8km 处的坡度
        "lonlat": [116.3974, 39.9093]
      },
      {
        "slope": 0.004,   // 10km 处的坡度
        "lonlat": [116.3974, 39.9093]
      }
    ]
    // 更多方向的数据...
  ]
  ```

## 工作原理

1. **接收扫描请求**: 接收包含经度、纬度和半径的请求
2. **计算雷达边界**: 根据给定的半径和方向计算扫描边界
3. **读取高程数据**: 从 GeoTIFF 文件中读取指定区域的高程数据
4. **计算坡度**: 分析不同距离处的地形坡度
5. **返回结果**: 将计算结果以 JSON 格式返回

## 测试

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
```

## 许可证

UNLICENSED
