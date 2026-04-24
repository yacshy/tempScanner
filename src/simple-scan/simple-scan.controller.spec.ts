import { Test, TestingModule } from '@nestjs/testing';
import { SimpleScanController } from './simple-scan.controller';

describe('SimpleScanController', () => {
  let controller: SimpleScanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimpleScanController],
    }).compile();

    controller = module.get<SimpleScanController>(SimpleScanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
