import { Test, TestingModule } from '@nestjs/testing';
import { SimpleScanService } from './simple-scan.service';

describe('SimpleScanService', () => {
  let service: SimpleScanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimpleScanService],
    }).compile();

    service = module.get<SimpleScanService>(SimpleScanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
