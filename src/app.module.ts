import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScanModule } from './scan/scan.module';
import { DynamicTextureModule } from './dynamic-texture/dynamic-texture.module';
import { SimpleScanModule } from './simple-scan/simple-scan.module';

@Module({
  imports: [ScanModule, DynamicTextureModule, SimpleScanModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
