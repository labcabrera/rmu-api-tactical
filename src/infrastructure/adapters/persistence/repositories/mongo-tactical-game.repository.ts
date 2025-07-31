import { Page } from '@domain/entities/page.entity';
import { TacticalGame } from '@domain/entities/tactical-game.entity';
import { TacticalGameRepository } from '@domain/ports/tactical-game.repository';
import { TacticalGameQuery } from '@domain/queries/tactical-game.query';
import TacticalGameModel from '../models/tactical-game.model';

export class MongoTacticalGameRepository implements TacticalGameRepository {

    async findById(id: string): Promise<TacticalGame> {
        const gameModel = await TacticalGameModel.findById(id);
        if(!gameModel) {
            //TODO create domain exception
            throw new Error(`Tactical Game with id ${id} not found`);
        }
        return this.toDomainEntity(gameModel);
    }

    async find(query: TacticalGameQuery): Promise<Page<TacticalGame>> {
        const { searchExpression, username, page, size } = query;
        let filter: any = {};
        if (username) {
            filter.user = username;
        }
        if (searchExpression) {
            filter.$or = [
                { name: { $regex: searchExpression, $options: 'i' } },
                { description: { $regex: searchExpression, $options: 'i' } }
            ];
        }
        const skip = page * size;
        const gameModels = await TacticalGameModel.find(filter)
                .skip(skip)
                .limit(size)
                .sort({ updatedAt: -1 });
        const content = gameModels.map(model => this.toDomainEntity(model));
        const count = await TacticalGameModel.countDocuments(filter);
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

    async save(game: TacticalGame): Promise<TacticalGame> {
        const gameModel = new TacticalGameModel({
            user: game.user,
            name: game.name,
            description: game.description,
            status: game.status,
            factions: game.factions,
            round: game.round
        });

        const savedModel = await gameModel.save();
        return this.toDomainEntity(savedModel);
    }

    async update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame> {
        const updatedModel = await TacticalGameModel.findByIdAndUpdate(
            id,
            { $set: game },
            { new: true }
        );
        if (!updatedModel) {
            throw new Error(`Tactical Game with id ${id} not found`);
        }
        return this.toDomainEntity(updatedModel);
    }

    async delete(id: string): Promise<void> {
        const result = await TacticalGameModel.findByIdAndDelete(id);
        if(!result) {
            throw new Error(`Tactical Game with id ${id} not found`);
        }
    }

    async countBy(filter: any): Promise<number> {
        return TacticalGameModel.countDocuments(filter);
    }

    private toDomainEntity(model: any): TacticalGame {
        return {
            id: model._id.toString(),
            user: model.user,
            name: model.name,
            description: model.description,
            status: model.status,
            factions: model.factions,
            round: model.round,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        };
    }
}
