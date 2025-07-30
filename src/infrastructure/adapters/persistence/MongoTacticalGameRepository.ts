import {
    PaginatedTacticalGames,
    TacticalGame,
    TacticalGameSearchCriteria
} from '../../../domain/entities/TacticalGame';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';
import TacticalGameModel from './models/tactical-game-model';

export class MongoTacticalGameRepository implements TacticalGameRepository {

    async findById(id: string): Promise<TacticalGame | null> {
        const gameModel = await TacticalGameModel.findById(id);
        return gameModel ? this.toDomainEntity(gameModel) : null;
    }

    async find(criteria: TacticalGameSearchCriteria): Promise<PaginatedTacticalGames> {
        const { searchExpression, username, page, size } = criteria;

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

        const [gameModels, total] = await Promise.all([
            TacticalGameModel.find(filter)
                .skip(skip)
                .limit(size)
                .sort({ updatedAt: -1 }),
            TacticalGameModel.countDocuments(filter)
        ]);

        const content = gameModels.map(model => this.toDomainEntity(model));

        return {
            content,
            page,
            size,
            total,
            totalPages: Math.ceil(total / size)
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

    async update(id: string, game: Partial<TacticalGame>): Promise<TacticalGame | null> {
        const updatedModel = await TacticalGameModel.findByIdAndUpdate(
            id,
            { $set: game },
            { new: true }
        );

        return updatedModel ? this.toDomainEntity(updatedModel) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await TacticalGameModel.findByIdAndDelete(id);
        return result !== null;
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
