import { ApiProperty } from '@nestjs/swagger';
import type {
  ActionMedical,
  ActionUseItem,
  ActionWarning,
  ActionWarningCode,
  MedicalStepResult,
} from '../../../domain/value-objects/action-medical.vo.js';

/** Workspace spec 068: a warning of the declaration or resolution of an action. */
export class ActionWarningDto {
  @ApiProperty({
    type: String,
    enum: [
      'treatment-interrupted',
      'exertion-reopens-wound',
      'limb-unusable',
      'limb-lost',
      'fear-balk-pace',
      'fear-balk-charge',
      'fear-retreat-pace',
    ],
  })
  code: ActionWarningCode;

  @ApiProperty({ type: Object, required: false, description: 'Values the message shows' })
  params?: Record<string, string | number | boolean>;

  @ApiProperty({ description: 'The request has to be sent again with `confirm: true`' })
  requiresConfirm: boolean;

  static fromEntity(entity: ActionWarning): ActionWarningDto {
    return Object.assign(new ActionWarningDto(), entity);
  }
}

/** Workspace spec 068, §2: a `medical` action, with each round resolved and its breakdown (spec 052). */
export class ActionMedicalDto {
  @ApiProperty()
  patientActorId: string;

  @ApiProperty({ type: String, nullable: true })
  injuryId: string | null;

  @ApiProperty({ type: String, nullable: true })
  effectId: string | null;

  @ApiProperty({ type: String })
  procedure: string;

  @ApiProperty({ description: 'Rounds of 4 AP it takes' })
  rounds: number;

  @ApiProperty({ required: false, description: 'The rounds come from the game master' })
  roundsOverride?: boolean;

  @ApiProperty({ type: Number, nullable: true })
  roll: number | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  difficulty?: string | null;

  @ApiProperty({ type: Object, nullable: true, required: false, description: '`{roll, itemId, total, success, bonus}`' })
  herbalism?: object | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  castSupport?: string | null;

  @ApiProperty({ type: Number, nullable: true, required: false })
  salveModifier?: number | null;

  @ApiProperty({ description: 'First action of the procedure (its continuations keep it)' })
  originActionId: string;

  @ApiProperty({ type: Number, nullable: true })
  startedRound: number | null;

  @ApiProperty()
  resolvedSteps: number;

  @ApiProperty({ type: String, enum: ['pending', 'in-progress', 'completed', 'aborted'] })
  state: string;

  @ApiProperty({ type: [Object], description: 'Rounds resolved: `{round, step, roll, total, result, breakdown, ...}`' })
  results: MedicalStepResult[];

  static fromEntity(entity: ActionMedical): ActionMedicalDto {
    const dto = Object.assign(new ActionMedicalDto(), structuredClone(entity));
    delete (dto as Partial<ActionMedical>).heatHitsRoll;
    delete (dto as Partial<ActionMedical>).heatCriticalRoll;
    delete (dto as Partial<ActionMedical>).unmodifiedRoll;
    return dto;
  }
}

/** Workspace spec 068, §2: a `use_item` action. */
export class ActionUseItemDto {
  @ApiProperty()
  itemId: string;

  @ApiProperty()
  targetActorId: string;

  @ApiProperty({ type: Number, nullable: true, required: false })
  roll?: number | null;

  @ApiProperty({ type: Object, nullable: true, required: false, description: '`{itemName, roll, healed, stunRoundsRemoved}`' })
  result?: object | null;

  static fromEntity(entity: ActionUseItem): ActionUseItemDto {
    return Object.assign(new ActionUseItemDto(), structuredClone(entity));
  }
}
