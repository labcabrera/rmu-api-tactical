import { TacticalActionAttack, TacticalActionAttackInfo, TacticalActionResult } from '../../domain/entities/tactical-action.entity';

export interface UpdateTacticalActionCommand {
    type?: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: TacticalActionAttackInfo;
    attacks?: TacticalActionAttack[];
    description?: string;
    result?: TacticalActionResult;
}
