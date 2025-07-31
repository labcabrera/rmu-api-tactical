import { Character } from "@/domain/entities/character.entity";
import { CharacterRepository } from "@/domain/ports/character.repository";
import { CharacterQuery } from "@/domain/queries/character.query";
import { Page } from "@domain/entities/page.entity";
import TacticalCharacterDocument from "../models/character.model";

export class MongoTacticalCharacterRepository implements CharacterRepository {
  async findById(id: string): Promise<Character> {
    const character = await TacticalCharacterDocument.findById(id);
    if (!character) {
      throw new Error(`Tactical character not found: ${id}`);
    }
    return this.toEntity(character);
  }

  async find(query: CharacterQuery): Promise<Page<Character>> {
    let filter: any = {};
    if (query.gameId) {
      filter.gameId = query.gameId;
    }
    const skip = query.page * query.size;
    const list = await TacticalCharacterDocument.find(filter)
      .skip(skip)
      .limit(query.size)
      .sort({ updatedAt: -1 });
    const count = await TacticalCharacterDocument.countDocuments(filter);
    const content = list.map((character) => this.toEntity(character));
    return {
      content,
      pagination: {
        page: query.page,
        size: query.size,
        totalElements: count,
        totalPages: Math.ceil(count / query.size),
      },
    };
  }

  async create(
    character: Omit<Character, "id" | "createdAt" | "updatedAt">,
  ): Promise<Character> {
    const newCharacter = new TacticalCharacterDocument(character);
    const savedCharacter = await newCharacter.save();
    return this.toEntity(savedCharacter);
  }

  async update(id: string, character: Partial<Character>): Promise<Character> {
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(
      id,
      character,
      { new: true },
    );
    if (!updatedCharacter) {
      throw new Error(`Tactical Character with id ${id} not found`);
    }
    return this.toEntity(updatedCharacter);
  }

  async delete(id: string): Promise<void> {
    const result = await TacticalCharacterDocument.findByIdAndDelete(id);
    if (!result) {
      throw new Error(`Tactical Character with id ${id} not found`);
    }
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
