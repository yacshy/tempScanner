import { Module } from '@nestjs/common';
import { SimpleScanController } from './simple-scan.controller';
import { SimpleScanService } from './simple-scan.service';

@Module({
  controllers: [SimpleScanController],
  providers: [SimpleScanService],
  exports: [SimpleScanService],
})
export class SimpleScanModule {}
