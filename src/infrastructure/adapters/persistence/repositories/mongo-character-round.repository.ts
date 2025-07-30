import { Page } from '../../../../domain/entities/page.entity';
import { TacticalCharacterRoundEntity, TacticalCharacterRoundSearchCriteria } from '../../../../domain/entities/tactical-character-round.entity';
import { TacticalCharacterRoundRepository } from '../../../../domain/ports/tactical-character-round.repository';
import TacticalCharacterRoundDocument from '../models/tactical-character-round.model';

export class MongoTacticalCharacterRoundRepository implements TacticalCharacterRoundRepository {
    async findById(id: string): Promise<TacticalCharacterRoundEntity | null> {
        const characterRound = await TacticalCharacterRoundDocument.findById(id);
        return characterRound ? this.toEntity(characterRound) : null;
    }

    async find(criteria: TacticalCharacterRoundSearchCriteria): Promise<Page<TacticalCharacterRoundEntity>> {
        let filter: any = {};

        if (criteria.gameId) {
            filter.gameId = criteria.gameId;
        }
        if (criteria.tacticalCharacterId) {
            filter.tacticalCharacterId = criteria.tacticalCharacterId;
        }
        if (criteria.round !== undefined) {
            filter.round = criteria.round;
        }
        if (criteria.hasInitiative !== undefined) {
            filter.initiative = criteria.hasInitiative ? { $exists: true, $ne: null } : { $exists: false };
        }
        if (criteria.actionPointsMin !== undefined) {
            filter.actionPoints = { ...filter.actionPoints, $gte: criteria.actionPointsMin };
        }
        if (criteria.actionPointsMax !== undefined) {
            filter.actionPoints = { ...filter.actionPoints, $lte: criteria.actionPointsMax };
        }
        if (criteria.createdAfter) {
            filter.createdAt = { ...filter.createdAt, $gte: criteria.createdAfter };
        }
        if (criteria.createdBefore) {
            filter.createdAt = { ...filter.createdAt, $lte: criteria.createdBefore };
        }

        const skip = (criteria.offset || 0);
        const limit = criteria.limit || 20;

        const list = await TacticalCharacterRoundDocument.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ round: 1, createdAt: -1 });

        const count = await TacticalCharacterRoundDocument.countDocuments(filter);
        const content = list.map(characterRound => this.toEntity(characterRound));

        return {
            content,
            page: Math.floor(skip / limit),
            size: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
        };
    }

    async findByGameIdAndRound(gameId: string, round: number): Promise<TacticalCharacterRoundEntity[]> {
        const characterRounds = await TacticalCharacterRoundDocument.find({
            gameId: gameId,
            round: round
        }).sort({ createdAt: -1 });

        return characterRounds.map(characterRound => this.toEntity(characterRound));
    }

    async findByCharacterIdAndRound(tacticalCharacterId: string, round: number): Promise<TacticalCharacterRoundEntity | null> {
        const characterRound = await TacticalCharacterRoundDocument.findOne({
            tacticalCharacterId: tacticalCharacterId,
            round: round
        });

        return characterRound ? this.toEntity(characterRound) : null;
    }

    async create(characterRound: Omit<TacticalCharacterRoundEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterRoundEntity> {
        const newCharacterRound = new TacticalCharacterRoundDocument(characterRound);
        const saved = await newCharacterRound.save();
        return this.toEntity(saved);
    }

    async update(id: string, characterRound: Partial<TacticalCharacterRoundEntity>): Promise<TacticalCharacterRoundEntity | null> {
        const updated = await TacticalCharacterRoundDocument.findByIdAndUpdate(
            id,
            characterRound,
            { new: true }
        );
        return updated ? this.toEntity(updated) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await TacticalCharacterRoundDocument.findByIdAndDelete(id);
        return result !== null;
    }

    async deleteByGameId(gameId: string): Promise<number> {
        const result = await TacticalCharacterRoundDocument.deleteMany({ gameId: gameId });
        return result.deletedCount || 0;
    }

    private toEntity(document: any): TacticalCharacterRoundEntity {
        const entity: TacticalCharacterRoundEntity = {
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
