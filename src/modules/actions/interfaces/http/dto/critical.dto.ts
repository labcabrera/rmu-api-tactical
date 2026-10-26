import { ApiProperty } from '@nestjs/swagger';
import { Critical } from '../../../domain/value-objects/critical.vo.js';

export class CriticalEffectDto {
  @ApiProperty({ description: 'Effect status', example: 'applied' })
  status: string;

  @ApiProperty({ type: Number, description: 'Number of rounds', example: 2 })
  rounds: number | undefined;

  @ApiProperty({ type: Number, description: 'Effect value', example: 5 })
  value: number | undefined;

  @ApiProperty({ type: Number, description: 'Effect delay', example: 1 })
  delay: number | undefined;

  @ApiProperty({ type: String, description: 'Effect condition', example: 'stunned' })
  condition: string | undefined;

  @ApiProperty({ type: String, description: 'source: falls on the attacker', required: false, enum: ['source', 'target'] })
  applyTo?: 'source' | 'target';
}

export class CriticalResultDto {
  @ApiProperty({ description: 'Result text', example: 'Lorem ipsum result text' })
  text: string;

  @ApiProperty({ description: 'Result damage', example: 5 })
  damage: number;

  @ApiProperty({ description: 'Result location', example: 'head' })
  location: string;

  @ApiProperty({ description: 'List of effects', type: [CriticalEffectDto], required: false })
  effects: CriticalEffectDto[];

  @ApiProperty({ description: 'Injury data of the entry (spec 013): type, secondary types and flags', required: false, type: Object })
  injury?: { type: string; secondary?: string[]; flags?: string[] };
}

export class CriticalStyleOptionDto {
  @ApiProperty({ example: 'leg-sweep' })
  abilityId: string;

  @ApiProperty({ example: 'K' })
  originalType: string;

  @ApiProperty({ example: 'C' })
  originalSeverity: string;
}

export class CriticalDto {
  @ApiProperty({ description: 'Critical key', example: 's_b_1' })
  key: string;

  @ApiProperty({ description: 'Critical status', enum: ['pending_roll', 'completed'], example: 'pending_roll' })
  status: string;

  @ApiProperty({ description: 'Critical type', example: 'S' })
  criticalType: string;

  @ApiProperty({ description: 'Critical severity', example: 'A' })
  criticalSeverity: string;

  @ApiProperty({ type: Number, description: 'Roll looked up: the roll plus the critical adjustment, clamped to 1..100', example: 10 })
  adjustedRoll: number | undefined;

  @ApiProperty({ description: 'Critical result', type: CriticalResultDto, required: false })
  result: CriticalResultDto | undefined;

  @ApiProperty({
    description: 'Fighting style ability that changed the critical, with its type and severity before',
    type: CriticalStyleOptionDto,
    required: false,
  })
  styleOption?: CriticalStyleOptionDto;

  static fromEntity(entity: Critical): CriticalDto {
    const dto = new CriticalDto();
    dto.key = entity.key;
    dto.status = entity.status;
    dto.criticalType = entity.criticalType;
    dto.criticalSeverity = entity.criticalSeverity;
    dto.adjustedRoll = entity.adjustedRoll;
    dto.styleOption = entity.styleOption ? { ...entity.styleOption } : undefined;
    dto.result = entity.result
      ? {
          text: entity.result.text,
          damage: entity.result.damage,
          location: entity.result.location,
          effects: entity.result.effects
            ? entity.result.effects.map(effect => ({
                status: effect.status,
                rounds: effect.rounds,
                value: effect.value,
                delay: effect.delay,
                condition: effect.condition,
                applyTo: effect.applyTo,
              }))
            : [],
          injury: entity.result.injury,
        }
      : undefined;
    return dto;
  }
}
