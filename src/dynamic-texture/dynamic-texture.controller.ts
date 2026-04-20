import {
  Controller,
  Post,
  Get,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { memoryStorage } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DynamicTextureService } from './dynamic-texture.service';
import { UploadModelResponseDto } from './dto/UploadModelDto';
import { UploadTextureResponseDto } from './dto/UploadTextureDto';

@Controller('dynamic-texture')
export class DynamicTextureController {
  constructor(private readonly dynamicTextureService: DynamicTextureService) {}

  @Post('model')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'model' }], { storage: memoryStorage() }),
  )
  async uploadModels(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'model/gltf-binary',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    files: {
      model: Array<Express.Multer.File>;
    },
  ): Promise<UploadModelResponseDto> {
    return this.dynamicTextureService.uploadModels(files.model);
  }

  @Post('texture')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'texture' }], { storage: memoryStorage() }),
  )
  async uploadTextures(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(png|jpeg)$/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    files: Express.Multer.File[],
  ): Promise<UploadTextureResponseDto> {
    return await this.dynamicTextureService.uploadTextures(files);
  }

  @Get('regenerate-model')
  async regenerateModel(): Promise<string> {
    return await this.dynamicTextureService.regenerateModel();
  }
}
