import { Injectable } from '@nestjs/common';
import fse from 'fs-extra';
import path from 'path';
import { UploadModelResponseDto } from './dto/UploadModelDto';
import { UploadTextureResponseDto } from './dto/UploadTextureDto';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';

@Injectable()
export class DynamicTextureService {
  async uploadModels(
    files: Array<Express.Multer.File>,
  ): Promise<UploadModelResponseDto> {
    const response: Array<Record<string, string>> = [];
    for (const file of files) {
      const targetPath = path.resolve(
        __dirname,
        '../../assets/glb-models_raw',
        file.filename,
      );
      const isExit = await fse.exists(targetPath);
      response.push({
        modelName: file.filename,
        msg: isExit ? '复写成功' : '上传成功',
      });
      await fse.writeFile(targetPath, file.buffer);
    }
    return { data: response };
  }

  async uploadTextures(
    files: Array<Express.Multer.File>,
  ): Promise<UploadTextureResponseDto> {
    const response: Array<Record<string, string>> = [];
    for (const file of files) {
      const targetPath = path.resolve(
        __dirname,
        '../../assets/model-textures',
        file.filename,
      );
      const isExit = await fse.exists(targetPath);
      response.push({
        modelName: file.filename,
        msg: isExit ? '复写成功' : '上传成功',
      });
      await fse.writeFile(targetPath, file.buffer);
    }
    return { data: response };
  }

  async regenerateModel(
    modelPath: string,
    texturePath: string,
    outputPath: string,
  ): Promise<string> {
    const io = new NodeIO();
    // 1. 加载模型（支持 glTF/GLB）
    const document = await io.read(modelPath);
    // 2. 读取并处理 PNG 材质图片
    const textureData = await sharp(texturePath).toBuffer();
    const texture = document
      .createTexture('diffuseTexture')
      .setImage(textureData)
      .setMimeType('image/png');
    // 3. 创建材质并绑定纹理
    const material = document
      .createMaterial('customMaterial')
      .setBaseColorTexture(texture)
      .setMetallicFactor(0.5); // 调整材质参数
    // 4. 将材质应用到所有网格
    document
      .getRoot()
      .listMeshes()
      .forEach((mesh) => {
        mesh.listPrimitives().forEach((primitive) => {
          primitive.setMaterial(material);
        });
      });
    // 5. 导出为 GLB 文件
    await io.write(outputPath, document);
    return 'success';
  }

  async fullRegenerateModel(): Promise<string> {
    const texturesPath = path.resolve(__dirname, '../../assets/glb-models_raw');
    const modelPath = path.resolve(__dirname, '../../assets/glb-models');

    const textureNames = await fse.readdir(texturesPath);
    const modelNames = await fse.readdir(modelPath);
    const outputDir = path.resolve(__dirname, '../../assets/glb-models');

    const genPromises: Array<Promise<string>> = [];

    for (const textureName of textureNames) {
      const texturePath = path.resolve(texturesPath, textureName);
      for (const modelName of modelNames) {
        const modelPath = path.resolve(outputDir, modelName);
        const outputPath = path.resolve(
          outputDir,
          modelName.split('.')[0],
          textureName.split('.')[0] + '.glb',
        );
        genPromises.push(
          this.regenerateModel(modelPath, texturePath, outputPath),
        );
      }
    }
    await Promise.all(genPromises);
    return 'success';
  }
}
