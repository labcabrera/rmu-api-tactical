import { ApiProperty } from '@nestjs/swagger';
import { ActionAttackModifiers, CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

export class ActionAttackModifiersDto {
  @ApiProperty({ description: 'Target actor round identifier', required: false, example: 'actor-round-003' })
  public targetId: string | undefined;

  @ApiProperty({ description: 'Base offensive value for the attack', required: false, example: 42 })
  public bo: number | undefined;

  @ApiProperty({ description: 'Parry value for the attack', required: false, example: 12 })
  public parry: number | undefined;

  @ApiProperty({
    description: 'Called shot location, if any',
    required: false,
    enum: ['none', 'head', 'body', 'arms', 'legs'],
    example: 'none',
  })
  public calledShot: CalledShot | undefined;

  @ApiProperty({ description: 'Penalty for the called shot, if any', required: false, example: 0 })
  public calledShotPenalty: number | undefined;

  @ApiProperty({ description: 'Positional advantage the attacker has', required: false, example: 'none' })
  public positionalSource: string | undefined;

  @ApiProperty({ description: 'Positional disadvantage the target has', required: false, example: 'none' })
  public positionalTarget: string | undefined;

  @ApiProperty({ description: 'Type of restricted quarters the attacker is in', required: false, example: 'none' })
  public restrictedQuarters: string | undefined;

  @ApiProperty({ description: 'Type of cover the target has', required: false, example: 'none' })
  public cover: string | undefined;

  @ApiProperty({ description: 'Type of dodge the target is performing', required: false, example: 'none' })
  public dodge: string | undefined;

  @ApiProperty({ description: 'Whether the attack disables defensive bonus', required: false, example: false })
  public disabledDB: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables shield use', required: false, example: false })
  public disabledShield: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack disables parry', required: false, example: false })
  public disabledParry: boolean | undefined;

  @ApiProperty({ description: 'Pace applied to the attack, if any', required: false, example: 'normal' })
  public pace: string | undefined;

  @ApiProperty({ description: 'Whether parry is restricted for this attack', required: false, example: false })
  public restrictedParry: boolean | undefined;

  @ApiProperty({ description: 'Whether attacker has higher ground', required: false, example: false })
  public higherGround: boolean | undefined;

  @ApiProperty({ description: 'Whether the foe is stunned', required: false, example: false })
  public stunnedFoe: boolean | undefined;

  @ApiProperty({ description: 'Whether the foe is surprised', required: false, example: false })
  public surprisedFoe: boolean | undefined;

  @ApiProperty({ description: 'Whether the source is prone', required: false, example: false })
  public proneSource: boolean | undefined;

  @ApiProperty({ description: 'Whether the target is prone', required: false, example: false })
  public proneTarget: boolean | undefined;

  @ApiProperty({ description: 'Whether attack is with off-hand', required: false, example: false })
  public offHand: boolean | undefined;

  @ApiProperty({ description: 'Whether the attack is an ambush', required: false, example: false })
  public ambush: boolean | undefined;

  @ApiProperty({ description: 'Range to the target in meters', required: false, example: 72 })
  public range: number | undefined;

  @ApiProperty({ description: 'Custom bonus to apply to the attack', required: false, example: 5 })
  public customBonus: number | undefined;

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
    dto.dodge = entity.dodge;
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
    return dto;
  }
}
