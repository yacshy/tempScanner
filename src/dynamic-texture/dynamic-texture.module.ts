import { Module } from '@nestjs/common';
import { DynamicTextureController } from './dynamic-texture.controller';
import { DynamicTextureService } from './dynamic-texture.service';

@Module({
  controllers: [DynamicTextureController],
  providers: [DynamicTextureService],
  exports: [DynamicTextureService],
})
export class DynamicTextureModule {}
