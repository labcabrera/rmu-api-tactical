/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { Page } from '../../../shared/domain/entities/page.entity';
import { ErrorDto, PagedQueryDto } from '../../../shared/infrastructure/controller/dto';
import { AddItemCommand } from '../../application/commands/add-item.comand';
import { AddSkillCommand } from '../../application/commands/add-skill.command';
import { CreateCharacterCommand } from '../../application/commands/create-character.command';
import { DeleteCharacterCommand } from '../../application/commands/delete-character.command';
import { DeleteItemCommand } from '../../application/commands/delete-item.command';
import { DeleteSkillCommand } from '../../application/commands/delete-skill-command';
import { UpdateCharacterCommand } from '../../application/commands/update-character.command';
import { UpdateSkillCommand } from '../../application/commands/update-skill.command';
import { GetCharacterQuery } from '../../application/queries/get-character.query';
import { GetCharactersQuery } from '../../application/queries/get-characters.query';
import { Character } from '../../domain/entities/character.entity';
import { AddItemDto } from './dto/add-item.dto';
import { AddSkillDto } from './dto/add-skill.dto';
import { CharacterDto, CharacterPageDto, UpdateCharacterDto } from './dto/character.dto';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/characters')
@ApiTags('Characters')
export class CharacterController {
  private readonly logger = new Logger(CharacterController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiOperation({ operationId: 'findGameById', summary: 'Find game by id' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiNotFoundResponse({ description: 'Realm not found', type: ErrorDto })
  async findById(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const query = new GetCharacterQuery(id, user.id as string, user.roles as string[]);
    const entity = await this.queryBus.execute<GetCharacterQuery, Character>(query);
    this.logger.debug(`Character found: ${JSON.stringify(entity)}`);
    return CharacterDto.fromEntity(entity);
  }

  @Get('')
  @ApiOkResponse({ type: CharacterPageDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'findCharacters', summary: 'Find characters by RSQL' })
  async find(@Query() dto: PagedQueryDto, @Request() req) {
    this.logger.debug(`Finding characters with query: ${JSON.stringify(dto)}`);
    const user = req.user!;
    const query = new GetCharactersQuery(dto.q, dto.page, dto.size, user.id as string, user.roles as string[]);
    const page = await this.queryBus.execute<GetCharactersQuery, Page<Character>>(query);
    const mapped = page.content.map((character) => CharacterDto.fromEntity(character));
    return new Page<CharacterDto>(mapped, page.pagination.page, page.pagination.size, page.pagination.totalElements);
  }

  @Post('')
  @ApiBody({ type: CreateCharacterDto })
  @ApiOperation({ operationId: 'createCharacter', summary: 'Create a new character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async create(@Body() dto: CreateCharacterDto, @Request() req) {
    this.logger.debug(`Creating character: ${JSON.stringify(dto, null, 2)} for user ${req.user}`);
    const user = req.user!;
    const command = CreateCharacterDto.toCommand(dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<CreateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateGame', summary: 'Update game' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateCharacterDto, @Request() req) {
    const user = req.user!;
    const command = UpdateCharacterDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateCharacterCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiOperation({ operationId: 'deleteRealm', summary: 'Delete realm by id' })
  async delete(@Param('id') id: string, @Request() req) {
    const user = req.user!;
    const command = new DeleteCharacterCommand(id, user.id as string, user.roles as string[]);
    await this.commandBus.execute(command);
  }

  @Post(':id/skills')
  @ApiBody({ type: AddSkillDto })
  @ApiOperation({ operationId: 'addSkill', summary: 'Add a new skill to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addSkill(@Param('id') id: string, @Body() dto: AddSkillDto, @Request() req) {
    this.logger.debug(`Adding skill: ${JSON.stringify(dto, null, 2)} for user ${req.user}`);
    const user = req.user!;
    const command = AddSkillDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Patch(':id/skills/:skillId')
  @ApiBody({ type: UpdateSkillDto })
  @ApiOperation({ operationId: 'updateSkill', summary: 'Update a skill of a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async updateSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Body() dto: UpdateSkillDto, @Request() req) {
    this.logger.debug(`Updating skill: ${JSON.stringify(dto, null, 2)} for user ${req.user}`);
    const user = req.user!;
    const command = UpdateSkillDto.toCommand(id, skillId, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<UpdateSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/skills/:skillId')
  @ApiOperation({ operationId: 'deleteSkill', summary: 'Delete a skill from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteSkill(@Param('id') id: string, @Param('skillId') skillId: string, @Request() req) {
    this.logger.debug(`Deleting character ${id} skill ${skillId} for user ${req.user}`);
    const user = req.user!;
    const command = new DeleteSkillCommand(id, skillId, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteSkillCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Post(':id/items')
  @ApiBody({ type: AddItemDto })
  @ApiOperation({ operationId: 'addItem', summary: 'Add a new item to a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async addItem(@Param('id') id: string, @Body() dto: AddItemDto, @Request() req) {
    this.logger.debug(`Adding item: ${JSON.stringify(dto, null, 2)} for user ${req.user}`);
    const user = req.user!;
    const command = AddItemDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<AddItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ operationId: 'deleteItem', summary: 'Delete an item from a character' })
  @ApiOkResponse({ type: CharacterDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req) {
    this.logger.debug(`Deleting character ${id} item ${itemId} for user ${req.user}`);
    const user = req.user!;
    const command = new DeleteItemCommand(id, itemId, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<DeleteItemCommand, Character>(command);
    return CharacterDto.fromEntity(entity);
  }
}
