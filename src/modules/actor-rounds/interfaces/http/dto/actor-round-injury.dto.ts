import { ApiProperty } from '@nestjs/swagger';
import { InjuryPoisonDto } from './poison.dto.js';
import type { ActorRoundSnapshot } from '../../../domain/aggregates/actor-round-props.js';
import type {
  BleedingControl,
  BodyLocation,
  BodySide,
  Injury,
  InjuryFlag,
  InjuryRecovery,
  InjurySeverity,
  InjurySource,
  InjuryStatus,
  InjuryTreatment,
  InjuryType,
} from '../../../domain/value-objects/injury.vo.js';

/** An injury of the actor (spec 013, §1), the model shared with the strategic API. */
export class InjuryDto {
  @ApiProperty({ description: 'Stable uuid, shared with the strategic character' })
  id: string;

  @ApiProperty({ type: String, enum: ['bone', 'cut-burn', 'muscle-tendon', 'organ', 'poison-disease', 'skin-tissue', 'unknown'] })
  type: InjuryType;

  @ApiProperty({ type: String, enum: ['light', 'medium', 'severe'] })
  severity: InjurySeverity;

  @ApiProperty({ type: String, enum: ['head', 'chest', 'abdomen', 'arm', 'leg'], required: false })
  location?: BodyLocation;

  @ApiProperty({ type: String, enum: ['left', 'right'], required: false })
  side?: BodySide;

  @ApiProperty({ description: 'Current penalty (0 or negative)' })
  penalty: number;

  @ApiProperty({ description: 'Penalty when the injury was taken' })
  initialPenalty: number;

  @ApiProperty({ description: 'Hits per round; 0 or missing when stopped', required: false })
  bleeding?: number;

  @ApiProperty({ type: String, enum: ['pressure', 'stitches', 'tourniquet', 'cauterized', 'magic'], required: false })
  bleedingControl?: BleedingControl;

  @ApiProperty({ type: [String], required: false })
  flags?: InjuryFlag[];

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ description: 'Origin: kind, game, action, round, attacker and critical key', type: Object })
  source: InjurySource;

  @ApiProperty({ description: 'Treatments, oldest first', type: [Object] })
  treatments: InjuryTreatment[];

  @ApiProperty({ type: Object, required: false })
  recovery?: InjuryRecovery;

  @ApiProperty({ type: Object, required: false })
  permanent?: { penalty: number; roll?: number };

  @ApiProperty({ type: InjuryPoisonDto, required: false, description: 'A poisoning (workspace spec 042)' })
  poison?: InjuryPoisonDto;

  @ApiProperty({ type: String, enum: ['active', 'recovering', 'permanent', 'healed'] })
  status: InjuryStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ required: false })
  updatedAt?: string;

  @ApiProperty({ required: false })
  healedAt?: string;

  static fromEntity(entity: Injury): InjuryDto {
    const dto = Object.assign(new InjuryDto(), entity, { treatments: [...(entity.treatments || [])] });
    if (entity.poison) dto.poison = InjuryPoisonDto.fromEntity(entity.poison);
    return dto;
  }
}

export class ActorRoundSnapshotDto {
  @ApiProperty({ description: 'Hits of the character when it joined the game' })
  hp: number;

  @ApiProperty({ type: [String], description: 'Injuries it brought' })
  injuryIds: string[];

  @ApiProperty({ type: [String], description: 'Unresolved conditions it brought' })
  conditionIds: string[];

  static fromEntity(entity: ActorRoundSnapshot): ActorRoundSnapshotDto {
    return Object.assign(new ActorRoundSnapshotDto(), entity);
  }
}
