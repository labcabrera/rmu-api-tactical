import { TacticalActionAttackInfo } from '@domain/entities/tactical-action.entity';

export interface CreateTacticalActionCommand {
    readonly tacticalGameId: string;
    readonly tacticalCharacterId: string;
    readonly characterId?: string;
    readonly round: number;
    readonly type: string;
    readonly phaseStart?: string;
    readonly actionPoints?: number;
    readonly attackInfo?: TacticalActionAttackInfo;
    readonly description?: string;
}