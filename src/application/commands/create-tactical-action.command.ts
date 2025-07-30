import { TacticalActionAttackInfo } from '../../domain/entities/tactical-action.entity';

export interface CreateTacticalActionCommand {
    tacticalGameId: string;
    tacticalCharacterId: string;
    characterId?: string;
    round: number;
    type: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: TacticalActionAttackInfo;
    description?: string;
}