import { ActionAttack, ActionAttackInfo, ActionResult } from '@domain/entities/action.entity';

export interface UpdateActionCommand {
  readonly type?: string;
  readonly phaseStart?: string;
  readonly actionPoints?: number;
  readonly attackInfo?: ActionAttackInfo;
  readonly attacks?: ActionAttack[];
  readonly description?: string;
  readonly result?: ActionResult;
}
