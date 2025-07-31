import { Page } from '@domain/entities/page.entity';
import { TacticalAction } from '@domain/entities/tactical-action.entity';
import { TacticalActionRepository } from '@domain/ports/tactical-action.repository';

import { TacticalActionQuery } from '../../../../domain/queries/tactical-action.query';
import TacticalActionDocument from '../models/tactical-action.model';

export class MongoTacticalActionRepository implements TacticalActionRepository {

    async findById(id: string): Promise<TacticalAction> {
        const action = await TacticalActionDocument.findById(id);
        if(!action) {
            throw new Error(`Tactical action with ID ${id} not found`);
        }
        return this.toEntity(action);
    }

    async find(criteria: TacticalActionQuery): Promise<Page<TacticalAction>> {
        let filter: any = {};

        if (criteria.gameId) {
            filter.gameId = criteria.gameId;
        }
        if (criteria.characterId) {
            filter.characterId = criteria.characterId;
        }
        if (criteria.round) {
            filter.round = criteria.round;
        }
        if (criteria.actionType) {
            filter.type = criteria.actionType;
        }
        const skip = criteria.page * criteria.size
        const list = await TacticalActionDocument.find(filter)
            .skip(skip)
            .limit(criteria.size)
            .sort({ round: 1, createdAt: -1 });
        const count = await TacticalActionDocument.countDocuments(filter);
        const content = list.map(action => this.toEntity(action));
        return {
            content,
            pagination: {
                page: criteria.page,
                size: criteria.size,
                totalElements: count,
                totalPages: Math.ceil(count / criteria.size)
            }
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

    async delete(actionId: string): Promise<void> {
        await TacticalActionDocument.findByIdAndDelete(actionId);
    }

    async deleteByGameId(gameId: string): Promise<void> {
        await TacticalActionDocument.deleteMany({ tacticalGameId: gameId });
    }

    async deleteByCharacterId(characterId: string): Promise<void> {
        await TacticalActionDocument.deleteMany({ characterId: characterId });
    }

    private toEntity(document: any): TacticalAction {
        const entity: TacticalAction = {
            id: document._id?.toString() || document.id,
            gameId: document.gameId,
            characterId: document.characterId,
            round: document.round,
            type: document.type,
            actionPoints: document.actionPoints,
            attackInfo: document.attackInfo,
            phaseStart: document.phaseStart,
            result: document.result,
            description: document.description,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
        };
        return entity;
    }
}
