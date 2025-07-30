import { TacticalCharacterEntity, TacticalCharacterSearchCriteria } from '../../domain/entities/tactical-character.entity';
import { TacticalCharacterRepository } from '../../domain/ports/TacticalCharacterRepository';
import TacticalCharacterDocument from '../../models/tactical-character-model';
import { IPaginatedResponse } from '../../types';

export class MongoTacticalCharacterRepository implements TacticalCharacterRepository {
    async findById(id: string): Promise<TacticalCharacterEntity | null> {
        const character = await TacticalCharacterDocument.findById(id);
        return character ? this.toEntity(character) : null;
    }

    async find(criteria: TacticalCharacterSearchCriteria): Promise<IPaginatedResponse<TacticalCharacterEntity>> {
        let filter: any = {};
        if (criteria.tacticalGameId) {
            filter.gameId = criteria.tacticalGameId;
        }

        const skip = criteria.page * criteria.size;
        const list = await TacticalCharacterDocument.find(filter)
            .skip(skip)
            .limit(criteria.size)
            .sort({ updatedAt: -1 });

        const count = await TacticalCharacterDocument.countDocuments(filter);
        const content = list.map(character => this.toEntity(character));
        const totalPages = Math.ceil(count / criteria.size);

        return {
            content,
            page: criteria.page,
            size: criteria.size,
            total: count,
            totalPages
        };
    }

    async create(character: Omit<TacticalCharacterEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TacticalCharacterEntity> {
        const newCharacter = new TacticalCharacterDocument(character);
        const savedCharacter = await newCharacter.save();
        return this.toEntity(savedCharacter);
    }

    async update(id: string, character: Partial<TacticalCharacterEntity>): Promise<TacticalCharacterEntity | null> {
        const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(id, character, { new: true });
        return updatedCharacter ? this.toEntity(updatedCharacter) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await TacticalCharacterDocument.findByIdAndDelete(id);
        return result !== null;
    }

    private toEntity(character: any): TacticalCharacterEntity {
        return {
            id: character._id.toString(),
            gameId: character.gameId,
            name: character.name,
            faction: character.faction,
            hitPoints: character.hitPoints,
            maxHitPoints: character.maxHitPoints,
            initiative: character.initiative,
            status: character.status,
            position: character.position,
            skills: character.skills,
            equipment: character.equipment,
            createdAt: character.createdAt,
            updatedAt: character.updatedAt
        };
    }
}
