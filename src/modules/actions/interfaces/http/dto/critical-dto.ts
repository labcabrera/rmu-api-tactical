import { ApiProperty } from '@nestjs/swagger';
import { Critical } from '../../../domain/value-objects/action-attack.vo';

export class CriticalEffectDto {
  @ApiProperty({ description: 'Effect status', example: 'applied' })
  status: string;

  @ApiProperty({ description: 'Number of rounds', example: 2 })
  rounds: number | undefined;

  @ApiProperty({ description: 'Effect value', example: 5 })
  value: number | undefined;

  @ApiProperty({ description: 'Effect delay', example: 1 })
  delay: number | undefined;

  @ApiProperty({ description: 'Effect condition', example: 'stunned' })
  condition: string | undefined;
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
}

export class CriticalDto {
  @ApiProperty({ description: 'Critical key', example: 's_b_1' })
  key: string;

  @ApiProperty({ description: 'Critical status', example: 'applied' })
  status: string;

  @ApiProperty({ description: 'Critical type', example: 'S' })
  criticalType: string;

  @ApiProperty({ description: 'Critical severity', example: 'A' })
  criticalSeverity: string;

  @ApiProperty({ description: 'Adjusted roll', example: 10 })
  adjustedRoll: number | undefined;

  @ApiProperty({ description: 'Critical result', type: CriticalResultDto, required: false })
  result: CriticalResultDto | undefined;

  static fromEntity(entity: Critical): CriticalDto {
    const dto = new CriticalDto();
    dto.key = entity.key;
    dto.status = entity.status;
    dto.criticalType = entity.criticalType;
    dto.criticalSeverity = entity.criticalSeverity;
    dto.adjustedRoll = entity.adjustedRoll;
    dto.result = entity.result
      ? {
          text: entity.result.text,
          damage: entity.result.damage,
          location: entity.result.location,
          effects: entity.result.effects.map((effect) => ({
            status: effect.status,
            rounds: effect.rounds,
            value: effect.value,
            delay: effect.delay,
            condition: effect.condition,
          })),
        }
      : undefined;
    return dto;
  }
}
