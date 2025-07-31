import { Page } from '@domain/entities/page.entity';
import { TacticalCharacterRound } from '@domain/entities/tactical-character-round.entity';
import { TacticalCharacterRoundRepository } from '@domain/ports/tactical-character-round.repository';
import { TacticalCharacterRoundQuery } from '@domain/queries/tactical-character-round.query';

import TacticalCharacterRoundDocument from '../models/tactical-character-round.model';

export class MongoTacticalCharacterRoundRepository implements TacticalCharacterRoundRepository {

    async findById(id: string): Promise<TacticalCharacterRound> {
        const characterRound = await TacticalCharacterRoundDocument.findById(id);
        if(!characterRound) {
            throw new Error(`Character round with id ${id} not found`);
        }
        return this.toEntity(characterRound);
    }

    async find(query: TacticalCharacterRoundQuery): Promise<Page<TacticalCharacterRound>> {
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
        const content = list.map(characterRound => this.toEntity(characterRound));
        return {
            content,
            pagination: {
                page: query.page,
                size: query.size,
                totalElements: count,
                totalPages: Math.ceil(count / query.size)
            }
        };
    }

    async findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRound[]> {
        const characterRounds = await TacticalCharacterRoundDocument.find({
            gameId: gameId,
            round: round
        }).sort({ createdAt: -1 });

        return characterRounds.map(characterRound => this.toEntity(characterRound));
    }

    async findByCharacterIdAndRound(tacticalCharacterId: string, round: number): Promise<TacticalCharacterRound | null> {
        const characterRound = await TacticalCharacterRoundDocument.findOne({
            tacticalCharacterId: tacticalCharacterId,
            round: round
        });

        return characterRound ? this.toEntity(characterRound) : null;
    }

    async create(characterRound: Omit<TacticalCharacterRound, 'id'>): Promise<TacticalCharacterRound> {
        const newCharacterRound = new TacticalCharacterRoundDocument(characterRound);
        const saved = await newCharacterRound.save();
        return this.toEntity(saved);
    }

    async update(id: string, characterRound: Partial<TacticalCharacterRound>): Promise<TacticalCharacterRound> {
        const updated = await TacticalCharacterRoundDocument.findByIdAndUpdate(
            id,
            characterRound,
            { new: true }
        );
        if(!updated) {
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

    private toEntity(document: any): TacticalCharacterRound {
        const entity: TacticalCharacterRound = {
            id: document._id?.toString() || document.id,
            gameId: document.gameId,
            tacticalCharacterId: document.tacticalCharacterId,
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
