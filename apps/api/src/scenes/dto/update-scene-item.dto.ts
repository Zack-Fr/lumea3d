import { PartialType } from '@nestjs/swagger';
import { CreateSceneItemDto } from './create-scene-item.dto';

export class UpdateSceneItemDto extends PartialType(CreateSceneItemDto) {}