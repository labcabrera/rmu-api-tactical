import { injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Page } from '@domain/entities/page.entity';
import { CharacterRepository } from '@application/ports/outbound/character.repository';

import TacticalCharacterDocument from '../models/character.model';
import { toMongoQuery } from '../rsql-adapter';

@injectable()
export class MongoCharacterRepository implements CharacterRepository {
  async findById(id: string): Promise<Character | null> {
    const character = await TacticalCharacterDocument.findById(id);
    return character ? this.toEntity(character) : null;
  }

  async findByRsql(rsql: string, page: number, size: number): Promise<Page<Character>> {
    const skip = page * size;
    const mongoQuery = toMongoQuery(rsql);
    const [characterDocs, totalElements] = await Promise.all([
      TacticalCharacterDocument.find(mongoQuery).skip(skip).limit(size).sort({ name: 1 }),
      TacticalCharacterDocument.countDocuments(mongoQuery),
    ]);
    const content = characterDocs.map(doc => this.toEntity(doc));
    return {
      content,
      pagination: {
        page: page,
        size: size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
      },
    };
  }

  async save(character: Partial<Character>): Promise<Character> {
    const document = new TacticalCharacterDocument(character);
    const saved = await document.save();
    return this.toEntity(saved);
  }

  async update(id: string, character: Partial<Character>): Promise<Character> {
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(id, character, { new: true });
    if (!updatedCharacter) {
      throw new Error(`Tactical Character with id ${id} not found`);
    }
    return this.toEntity(updatedCharacter);
  }

  async deleteById(id: string): Promise<void> {
    const result = await TacticalCharacterDocument.findByIdAndDelete(id);
    if (!result) {
      throw new Error(`Tactical Character with id ${id} not found`);
    }
  }

  async findByGameId(gameId: string): Promise<Character[]> {
    const characters = await TacticalCharacterDocument.find({ gameId: gameId });
    return characters.map(doc => this.toEntity(doc));
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await TacticalCharacterDocument.deleteMany({ gameId: gameId });
  }

  private toEntity(character: any): Character {
    return {
      id: character._id.toString(),
      gameId: character.gameId,
      name: character.name,
      faction: character.faction,
      info: character.info,
      statistics: character.statistics,
      movement: character.movement,
      defense: character.defense,
      hp: character.hp,
      endurance: character.endurance,
      power: character.power,
      initiative: character.initiative,
      skills: character.skills,
      items: character.items,
      equipment: character.equipment,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  }
}
