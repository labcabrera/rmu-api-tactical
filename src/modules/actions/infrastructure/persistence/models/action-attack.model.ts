import { Schema } from '@nestjs/mongoose';
import { AttackType } from '../../../domain/entities/action-attack.vo';
import { ActionStatus } from '../../../domain/entities/action-status.vo';

@Schema({ _id: false })
export class ActionAttack {
  public modifiers: ActionAttackModifiers;
  public externalAttackId: string | undefined;
  public status: ActionStatus;
}

export class ActionAttackModifiers {
  public attackName: string;
  public type: AttackType;
  public targetId: string;
  public parry: number;
  public bo: number;
  public cover: string | undefined;
  public restrictedQuarters: string | undefined;
  public positionalSource: string | undefined;
  public positionalTarget: string | undefined;
  public dodge: string | undefined;
  public range: number | undefined;
  public customBonus: number | undefined;
  public disabledDB: boolean | undefined;
  public disabledShield: boolean | undefined;
  public disabledParry: boolean | undefined;
}
