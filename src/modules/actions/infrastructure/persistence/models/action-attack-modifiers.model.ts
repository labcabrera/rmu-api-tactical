import type { AttackMode } from '../../../domain/services/special-maneuvers.js';
import { Prop, Schema } from '@nestjs/mongoose';
import type { CalledShot, ChargeSpeed, PositionalSource } from '../../../domain/value-objects/action-attack-modifiers.vo.js';

@Schema({ _id: false })
export class ActionAttackModifiers {
  @Prop({ type: String, required: false })
  public targetId: string | undefined;

  @Prop({ type: Number, required: false })
  public bo: number | undefined;

  @Prop({ type: Number, required: false })
  public parry: number | undefined;

  @Prop({ type: String, required: false })
  public calledShot: CalledShot | undefined;

  @Prop({ type: Number, required: false })
  public calledShotPenalty: number | undefined;

  @Prop({ type: String, required: false })
  public positionalSource: PositionalSource | undefined;

  @Prop({ type: String, required: false })
  public positionalTarget: string | undefined;

  @Prop({ type: String, required: false })
  public restrictedQuarters: string | undefined;

  @Prop({ type: String, required: false })
  public cover: string | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledDB: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledShield: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public disabledParry: boolean | undefined;

  @Prop({ type: String, required: false })
  public pace: string | undefined;

  @Prop({ type: Boolean, required: false })
  public restrictedParry: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public higherGround: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public stunnedFoe: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public surprisedFoe: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public proneSource: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public proneTarget: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public attackerInMelee: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public offHand: boolean | undefined;

  @Prop({ type: Boolean, required: false })
  public ambush: boolean | undefined;

  @Prop({ type: Number, required: false })
  public range: number | undefined;

  @Prop({ type: Number, required: false })
  public customBonus: number | undefined;

  @Prop({ type: String, required: false })
  public chargeSpeed: ChargeSpeed | undefined;

  @Prop({ type: String, required: false })
  public styleCriticalOption: string | undefined;

  /** Workspace spec 079, A6-A7: attack mode, disarm and subdual inputs, and the combatants giving cover in a melee. */
  @Prop({ type: String, required: false })
  public attackMode?: AttackMode;

  @Prop({ type: Number, required: false })
  public disarmDefenseRoll?: number | null;

  @Prop({ type: Boolean, required: false })
  public disarmTwoHanded?: boolean;

  @Prop({ type: Number, required: false })
  public subdualBonus?: number | null;

  @Prop({ type: Boolean, required: false })
  public unfamiliarAnatomy?: boolean;

  @Prop({ type: [String], required: false })
  public meleeCoverActorIds?: string[];

  /** Workspace spec 079, D3. */
  @Prop({ type: Boolean, required: false })
  public extraJoints?: boolean;
}
