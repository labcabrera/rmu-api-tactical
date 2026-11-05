import { ApiProperty } from '@nestjs/swagger';
import {
  ActionAttackModifiers,
  type CalledShot,
  type ChargeSpeed,
  normalizeChargeSpeed,
} from '../../../domain/value-objects/action-attack-modifiers.vo.js';
import { ATTACK_MODES, type AttackMode } from '../../../domain/services/special-maneuvers.js';

export class ActionAttackModifiersDto {
  @ApiProperty({ type: String, description: 'Target actor round identifier', required: false, example: 'actor-round-003' })
  public targetId: string | undefined;

  @ApiProperty({ type: Number, description: 'Base offensive value for the attack', required: false, example: 42 })
  public bo: number | undefined;

  @ApiProperty({ type: Number, description: 'Parry value for the attack', required: false, example: 12 })
  public parry: number | undefined;

  @ApiProperty({
    type: String,
    description: 'Called shot location, if any',
    required: false,
    enum: ['none', 'head', 'chest', 'abdomen', 'arms', 'legs'],
    example: 'none',
  })
  public calledShot: CalledShot | undefined;

  @ApiProperty({ type: Number, description: 'Penalty for the called shot, if any', required: false, example: 0 })
  public calledShotPenalty: number | undefined;

  @ApiProperty({ type: String, description: 'Positional advantage the attacker has', required: false, example: 'none' })
  public positionalSource: string | undefined;

  @ApiProperty({ type: String, description: 'Positional disadvantage the target has', required: false, example: 'none' })
  public positionalTarget: string | undefined;

  @ApiProperty({ type: String, description: 'Type of restricted quarters the attacker is in', required: false, example: 'none' })
  public restrictedQuarters: string | undefined;

  @ApiProperty({ type: String, description: 'Type of cover the target has', required: false, example: 'none' })
  public cover: string | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables defensive bonus', required: false, example: false })
  public disabledDB: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables shield use', required: false, example: false })
  public disabledShield: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack disables parry', required: false, example: false })
  public disabledParry: boolean | undefined;

  @ApiProperty({ type: String, description: 'Pace applied to the attack, if any', required: false, example: 'normal' })
  public pace: string | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether parry is restricted for this attack', required: false, example: false })
  public restrictedParry: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attacker has higher ground', required: false, example: false })
  public higherGround: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the foe is stunned', required: false, example: false })
  public stunnedFoe: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the foe is surprised', required: false, example: false })
  public surprisedFoe: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the source is prone', required: false, example: false })
  public proneSource: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the target is prone', required: false, example: false })
  public proneTarget: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attacker is in melee (close) range', required: false, example: false })
  public attackerInMelee: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether attack is with off-hand', required: false, example: false })
  public offHand: boolean | undefined;

  @ApiProperty({ type: Boolean, description: 'Whether the attack is an ambush', required: false, example: false })
  public ambush: boolean | undefined;

  @ApiProperty({ type: Number, description: 'Range to the target in meters', required: false, example: 72 })
  public range: number | undefined;

  @ApiProperty({ type: Number, description: 'Custom bonus to apply to the attack', required: false, example: 5 })
  public customBonus: number | undefined;

  @ApiProperty({
    type: String,
    description: 'Charge speed applied to attack size',
    required: false,
    enum: ['none', 'jog', 'sprint'],
    example: 'none',
  })
  public chargeSpeed: ChargeSpeed | undefined;

  @ApiProperty({ type: String, description: 'Fighting style ability that changes the critical', required: false })
  public styleCriticalOption: string | undefined;

  @ApiProperty({ type: String, description: 'Attack mode (spec 079, A7)', required: false, enum: ATTACK_MODES, example: 'normal' })
  public attackMode: AttackMode;

  @ApiProperty({ type: Number, nullable: true, description: "Disarm: total of the defender's roll (Table 9-7a)", required: false })
  public disarmDefenseRoll: number | null;

  @ApiProperty({ type: Boolean, description: 'Disarm: the foe wields its weapon with both hands', required: false })
  public disarmTwoHanded: boolean;

  @ApiProperty({ type: Number, nullable: true, description: 'Subdual: skill bonus entered by the game master', required: false })
  public subdualBonus: number | null;

  @ApiProperty({ type: Boolean, description: 'Subdual: the target has an unfamiliar anatomy', required: false })
  public unfamiliarAnatomy: boolean;

  @ApiProperty({ type: [String], description: 'Ranged attack into a melee: combatants engaged with the target (§9.7)', required: false })
  public meleeCoverActorIds: string[];

  static fromEntity(entity: ActionAttackModifiers): ActionAttackModifiersDto {
    const dto = new ActionAttackModifiersDto();
    dto.targetId = entity.targetId;
    dto.bo = entity.bo;
    dto.parry = entity.parry;
    dto.calledShot = entity.calledShot;
    dto.calledShotPenalty = entity.calledShotPenalty;
    dto.positionalSource = entity.positionalSource;
    dto.positionalTarget = entity.positionalTarget;
    dto.restrictedQuarters = entity.restrictedQuarters;
    dto.cover = entity.cover;
    dto.attackerInMelee = entity.attackerInMelee;
    dto.disabledDB = entity.disabledDB;
    dto.disabledShield = entity.disabledShield;
    dto.disabledParry = entity.disabledParry;
    dto.pace = entity.pace;
    dto.restrictedParry = entity.restrictedParry;
    dto.higherGround = entity.higherGround;
    dto.stunnedFoe = entity.stunnedFoe;
    dto.surprisedFoe = entity.surprisedFoe;
    dto.proneSource = entity.proneSource;
    dto.proneTarget = entity.proneTarget;
    dto.offHand = entity.offHand;
    dto.ambush = entity.ambush;
    dto.range = entity.range;
    dto.customBonus = entity.customBonus;
    dto.chargeSpeed = entity.chargeSpeed ? normalizeChargeSpeed(entity.chargeSpeed) : undefined;
    dto.styleCriticalOption = entity.styleCriticalOption;
    dto.attackMode = entity.attackMode ?? 'normal';
    dto.disarmDefenseRoll = entity.disarmDefenseRoll ?? null;
    dto.disarmTwoHanded = entity.disarmTwoHanded ?? false;
    dto.subdualBonus = entity.subdualBonus ?? null;
    dto.unfamiliarAnatomy = entity.unfamiliarAnatomy ?? false;
    dto.meleeCoverActorIds = entity.meleeCoverActorIds ?? [];
    return dto;
  }
}
