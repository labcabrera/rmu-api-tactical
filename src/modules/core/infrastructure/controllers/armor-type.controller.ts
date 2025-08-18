import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';

import * as armorTypeRepository from '../../application/ports/outbound/armor-type-repository';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ArmorTypeDto } from './dto/armor-type.dto';
import { NotFoundError } from '../../domain/errors/errors';

@UseGuards(JwtAuthGuard)
@Controller('v1/armor-types')
@ApiTags('Armor Types')
export class ArmorTypeController {
  constructor(@Inject('ArmorTypeRepository') private readonly armorTypeRepository: armorTypeRepository.ArmorTypeRepository) {}

  @Get(':id')
  @ApiOkResponse({ type: ArmorTypeDto })
  @ApiOperation({ operationId: 'findArmorTypeById', summary: 'Find armor type by id' })
  findById(@Param('id') id: number) {
    const entity = this.armorTypeRepository.findById(id);
    if (!entity) {
      throw new NotFoundError('Armor type', id);
    }
    return ArmorTypeDto.fromEntity(entity);
  }

  @Get('')
  @ApiOperation({ operationId: 'findAllArmorTypes', summary: 'Find all armor types' })
  @ApiOkResponse({ type: [ArmorTypeDto] })
  find() {
    const list = this.armorTypeRepository.find();
    return list.map((e) => ArmorTypeDto.fromEntity(e));
  }
}
