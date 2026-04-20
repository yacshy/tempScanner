import { Test, TestingModule } from '@nestjs/testing';
import { DynamicTextureService } from './dynamic-texture.service';

describe('DynamicTextureService', () => {
  let service: DynamicTextureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicTextureService],
    }).compile();

    service = module.get<DynamicTextureService>(DynamicTextureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
