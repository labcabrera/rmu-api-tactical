import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import * as characterSizeRepository from '../../application/ports/outbound/character-size-repository';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { CharacterSizeDto } from './dto/character-size.dto';
import { NotFoundError } from '../../domain/errors/errors';

@UseGuards(JwtAuthGuard)
@Controller('v1/character-sizes')
@ApiTags('Character Sizes')
export class CharacterSizeController {
  constructor(
    @Inject('CharacterSizeRepository') private readonly characterSizeRepository: characterSizeRepository.CharacterSizeRepository,
  ) {}

  @Get(':id')
  @ApiOperation({ operationId: 'findCharacterSizeById', summary: 'Find character size by id' })
  @ApiOkResponse({ type: CharacterSizeDto })
  findById(@Param('id') id: string) {
    const entity = this.characterSizeRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('CharacterSize', id);
    }
    return CharacterSizeDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: [CharacterSizeDto] })
  @ApiOperation({ operationId: 'findCharacterSizes', summary: 'Find all character sizes' })
  find() {
    const entities = this.characterSizeRepository.find();
    return entities.map((e) => CharacterSizeDto.fromEntity(e));
  }
}
