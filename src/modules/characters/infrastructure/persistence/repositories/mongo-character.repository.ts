/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { NotFoundError } from '../../../../shared/domain/errors';
import { RsqlParser } from '../../../../shared/infrastructure/messaging/rsql-parser';
import { CharacterRepository } from '../../../application/ports/out/character.repository';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterDocument, CharacterModel } from '../models/character.model';

@Injectable()
export class MongoCharacterRepository implements CharacterRepository {
  constructor(
    @InjectModel(CharacterModel.name) private characterModel: Model<CharacterDocument>,
    private rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<Character | null> {
    const readed = await this.characterModel.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }

  findByGameId(gameId: string): Promise<Character[]> {
    throw new Error('Method not implemented.');
  }

  deleteByGameId(gameId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Character>> {
    const skip = page * size;
    const mongoQuery = this.rsqlParser.parse(rsql);
    const [charactersDocs, totalElements] = await Promise.all([
      this.characterModel.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      this.characterModel.countDocuments(mongoQuery),
    ]);
    const content = charactersDocs.map((doc) => this.mapToEntity(doc));
    return new Page<Character>(content, page, size, totalElements);
  }

  async save(request: Partial<Character>): Promise<Character> {
    const model = new this.characterModel({ ...request, _id: request.id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(id: string, request: Partial<Character>): Promise<Character> {
    const current = await this.characterModel.findById(id);
    if (!current) {
      throw new NotFoundError('Character', id);
    }
    const update = {};
    const updatedCharacter = await this.characterModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!updatedCharacter) {
      throw new NotFoundError('Character', id);
    }
    return this.mapToEntity(updatedCharacter);
  }

  async deleteById(id: string): Promise<Character | null> {
    const result = await this.characterModel.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.characterModel.exists({ _id: id });
    return exists !== null;
  }

  private mapToEntity(doc: CharacterDocument): Character {
    return {
      id: doc.id as string,
      gameId: doc.gameId,
      name: doc.name,
      faction: doc.faction,
      info: doc.info,
      statistics: doc.statistics,
      movement: doc.movement,
      defense: doc.defense,
      hp: doc.hp,
      endurance: doc.endurance,
      power: doc.power,
      initiative: doc.initiative,
      skills: doc.skills,
      items: doc.items,
      equipment: doc.equipment,
      status: doc.status,
      owner: doc.owner,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
