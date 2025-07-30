import { Page } from '../../../../domain/entities/page.entity';
import { TacticalAction, TacticalActionSearchCriteria } from '../../../../domain/entities/tactical-action.entity';
import { TacticalActionRepository } from '../../../../domain/ports/tactical-action.repository';
import TacticalActionDocument from './../models/tactical-action-model';

export class MongoTacticalActionRepository implements TacticalActionRepository {
    async findById(id: string): Promise<TacticalAction | null> {
        const action = await TacticalActionDocument.findById(id);
        return action ? this.toEntity(action) : null;
    }

    async find(criteria: TacticalActionSearchCriteria): Promise<Page<TacticalAction>> {
        let filter: any = {};

        if (criteria.tacticalGameId) {
            filter.tacticalGameId = criteria.tacticalGameId;
        }
        if (criteria.tacticalCharacterId) {
            filter.tacticalCharacterId = criteria.tacticalCharacterId;
        }
        if (criteria.characterId) {
            filter.characterId = criteria.characterId;
        }
        if (criteria.round !== undefined) {
            filter.round = criteria.round;
        }
        if (criteria.type) {
            filter.type = criteria.type;
        }
        if (criteria.phaseStart) {
            filter.phaseStart = criteria.phaseStart;
        }
        if (criteria.hasAttacks !== undefined) {
            filter.attacks = criteria.hasAttacks ? { $exists: true, $ne: [] } : { $exists: false };
        }
        if (criteria.hasResult !== undefined) {
            filter.result = criteria.hasResult ? { $exists: true, $ne: null } : { $exists: false };
        }
        if (criteria.createdAfter) {
            filter.createdAt = { ...filter.createdAt, $gte: criteria.createdAfter };
        }
        if (criteria.createdBefore) {
            filter.createdAt = { ...filter.createdAt, $lte: criteria.createdBefore };
        }

        const skip = (criteria.offset || 0);
        const limit = criteria.limit || 20;

        const list = await TacticalActionDocument.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ round: 1, createdAt: -1 });

        const count = await TacticalActionDocument.countDocuments(filter);
        const content = list.map(action => this.toEntity(action));

        return {
            content,
            page: Math.floor(skip / limit),
            size: limit,
            total: count,
            totalPages: Math.ceil(count / limit)
        };
    }

    async findByGameId(gameId: string): Promise<TacticalAction[]> {
        const actions = await TacticalActionDocument.find({
            tacticalGameId: gameId
        }).sort({ round: 1, createdAt: -1 });

        return actions.map(action => this.toEntity(action));
    }

    async findByGameIdAndRound(gameId: string, round: number): Promise<TacticalAction[]> {
        const actions = await TacticalActionDocument.find({
            tacticalGameId: gameId,
            round: round
        }).sort({ createdAt: -1 });

        return actions.map(action => this.toEntity(action));
    }

    async findByCharacterId(characterId: string): Promise<TacticalAction[]> {
        const actions = await TacticalActionDocument.find({
            $or: [
                { tacticalCharacterId: characterId },
                { characterId: characterId }
            ]
        }).sort({ round: 1, createdAt: -1 });

        return actions.map(action => this.toEntity(action));
    }

    async findByCharacterIdAndRound(characterId: string, round: number): Promise<TacticalAction[]> {
        const actions = await TacticalActionDocument.find({
            $or: [
                { tacticalCharacterId: characterId },
                { characterId: characterId }
            ],
            round: round
        }).sort({ createdAt: -1 });

        return actions.map(action => this.toEntity(action));
    }

    async create(action: Omit<TacticalAction, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalAction> {
        const newAction = new TacticalActionDocument(action);
        const saved = await newAction.save();
        return this.toEntity(saved);
    }

    async update(id: string, action: Partial<TacticalAction>): Promise<TacticalAction | null> {
        const updated = await TacticalActionDocument.findByIdAndUpdate(
            id,
            action,
            { new: true }
        );
        return updated ? this.toEntity(updated) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await TacticalActionDocument.findByIdAndDelete(id);
        return result !== null;
    }

    async deleteByGameId(gameId: string): Promise<number> {
        const result = await TacticalActionDocument.deleteMany({ tacticalGameId: gameId });
        return result.deletedCount || 0;
    }

    async deleteByCharacterId(characterId: string): Promise<number> {
        const result = await TacticalActionDocument.deleteMany({
            $or: [
                { tacticalCharacterId: characterId },
                { characterId: characterId }
            ]
        });
        return result.deletedCount || 0;
    }

    private toEntity(document: any): TacticalAction {
        const entity: TacticalAction = {
            id: document._id?.toString() || document.id,
            gameId: document.gameId,
            characterId: document.characterId,
            round: document.round,
            type: document.type,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
        };

        if (document.characterId) {
            entity.characterId = document.characterId;
        }
        if (document.phaseStart) {
            entity.phaseStart = document.phaseStart;
        }
        if (document.actionPoints !== undefined) {
            entity.actionPoints = document.actionPoints;
        }
        if (document.attackInfo) {
            entity.attackInfo = document.attackInfo;
        }
        if (document.attacks && Array.isArray(document.attacks)) {
            entity.attacks = document.attacks;
        }
        if (document.description) {
            entity.description = document.description;
        }
        if (document.result) {
            entity.result = document.result;
        }

        return entity;
    }
}
