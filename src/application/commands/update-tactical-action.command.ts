import { TacticalActionAttack, TacticalActionAttackInfo, TacticalActionResult } from '@domain/entities/tactical-action.entity';

export interface UpdateTacticalActionCommand {
    readonly type?: string;
    readonly phaseStart?: string;
    readonly actionPoints?: number;
    readonly attackInfo?: TacticalActionAttackInfo;
    readonly attacks?: TacticalActionAttack[];
    readonly description?: string;
    readonly result?: TacticalActionResult;
}
