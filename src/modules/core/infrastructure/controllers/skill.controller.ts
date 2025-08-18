import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';

import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import * as skillRepository from '../../application/ports/outbound/skill-repository';
import { SkillDto } from './dto/skill.dto';
import { NotFoundError } from '../../domain/errors/errors';

@UseGuards(JwtAuthGuard)
@Controller('v1/skills')
@ApiTags('Skills')
export class SkillController {
  constructor(@Inject('SkillRepository') private readonly skillRepository: skillRepository.SkillRepository) {}

  @Get(':id')
  @ApiOkResponse({ type: SkillDto })
  @ApiOperation({ operationId: 'findSkillById', summary: 'Find skill by id' })
  findById(@Param('id') id: string) {
    const skill = this.skillRepository.findById(id);
    if (!skill) {
      throw new NotFoundError('Skill', id);
    }
    return SkillDto.fromEntity(skill);
  }

  @Get('')
  @ApiOkResponse({ type: [SkillDto] })
  @ApiOperation({ operationId: 'findAllSkills', summary: 'Find all skills' })
  find() {
    const list = this.skillRepository.findAll();
    return list.map((e) => SkillDto.fromEntity(e));
  }

  @Get('/category/:categoryId')
  @ApiOkResponse({ type: [SkillDto] })
  @ApiOperation({ operationId: 'findAllSkillsByCategory', summary: 'Find all skills by category' })
  findByCategory(@Param('categoryId') categoryId: string) {
    const list = this.skillRepository.findByCategory(categoryId);
    return list.map((e) => SkillDto.fromEntity(e));
  }
}
