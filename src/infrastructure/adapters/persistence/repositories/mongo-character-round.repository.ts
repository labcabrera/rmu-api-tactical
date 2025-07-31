import { CharacterRound } from "@/domain/entities/character-round.entity";
import { CharacterRoundRepository } from "@/domain/ports/character-round.repository";
import { CharacterRoundQuery } from "@/domain/queries/character-round.query";
import { Page } from "@domain/entities/page.entity";

import TacticalCharacterRoundDocument from "../models/tactical-character-round.model";

export class MongoTacticalCharacterRoundRepository
  implements CharacterRoundRepository
{
  async findById(id: string): Promise<CharacterRound> {
    const characterRound = await TacticalCharacterRoundDocument.findById(id);
    if (!characterRound) {
      throw new Error(`Character round with id ${id} not found`);
    }
    return this.toEntity(characterRound);
  }

  async find(query: CharacterRoundQuery): Promise<Page<CharacterRound>> {
    const filter: any = {};
    if (query.gameId) {
      filter.gameId = query.gameId;
    }
    if (query.characterId) {
      filter.characterId = query.characterId;
    }
    if (query.round !== undefined) {
      filter.round = query.round;
    }
    const skip = query.page * query.size;
    const list = await TacticalCharacterRoundDocument.find(filter)
      .skip(skip)
      .limit(query.size)
      .sort({ round: 1, createdAt: -1 });
    const count = await TacticalCharacterRoundDocument.countDocuments(filter);
    const content = list.map((characterRound) => this.toEntity(characterRound));
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

  async findByGameIdAndRound(
    gameId: string,
    round: number,
  ): Promise<CharacterRound[]> {
    const characterRounds = await TacticalCharacterRoundDocument.find({
      gameId: gameId,
      round: round,
    }).sort({ createdAt: -1 });

    return characterRounds.map((characterRound) =>
      this.toEntity(characterRound),
    );
  }

  async findByCharacterIdAndRound(
    characterId: string,
    round: number,
  ): Promise<CharacterRound | null> {
    const characterRound = await TacticalCharacterRoundDocument.findOne({
      characterId: characterId,
      round: round,
    });

    return characterRound ? this.toEntity(characterRound) : null;
  }

  async create(
    characterRound: Omit<CharacterRound, "id">,
  ): Promise<CharacterRound> {
    const newCharacterRound = new TacticalCharacterRoundDocument(
      characterRound,
    );
    const saved = await newCharacterRound.save();
    return this.toEntity(saved);
  }

  async update(
    id: string,
    characterRound: Partial<CharacterRound>,
  ): Promise<CharacterRound> {
    const updated = await TacticalCharacterRoundDocument.findByIdAndUpdate(
      id,
      characterRound,
      { new: true },
    );
    if (!updated) {
      throw new Error(`Character round with id ${id} not found`);
    }
    return this.toEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await TacticalCharacterRoundDocument.findByIdAndDelete(id);
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await TacticalCharacterRoundDocument.deleteMany({ gameId: gameId });
  }

  private toEntity(document: any): CharacterRound {
    const entity: CharacterRound = {
      id: document._id?.toString() || document.id,
      gameId: document.gameId,
      characterId: document.characterId,
      round: document.round,
      actionPoints: document.actionPoints,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    if (document.initiative) {
      entity.initiative = {
        base: document.initiative.base || 0,
        penalty: document.initiative.penalty || 0,
        roll: document.initiative.roll || 0,
        total: document.initiative.total || 0,
      };
    }

    return entity;
  }
}
