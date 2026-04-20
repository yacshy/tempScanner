import { Test, TestingModule } from '@nestjs/testing';
import { DynamicTextureController } from './dynamic-texture.controller';

describe('DynamicTextureController', () => {
  let controller: DynamicTextureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicTextureController],
    }).compile();

    controller = module.get<DynamicTextureController>(DynamicTextureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
