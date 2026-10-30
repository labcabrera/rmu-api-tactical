import { ApiProperty } from '@nestjs/swagger';
import type { ModifierGroup, ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { SkippedRule } from '../../../domain/value-objects/skipped-rule.vo.js';

export class SkippedRuleDto {
  @ApiProperty({ description: 'Combat plugin of the rule', example: 'shield' })
  source: string;

  @ApiProperty({ description: 'Breakdown group of the plugin', enum: ['offense', 'defense', 'situation', 'critical', 'resolution'] })
  group: ModifierGroup;

  @ApiProperty({ description: 'Why the rule does not apply: the key of its explanation', example: 'shield-not-front' })
  reason: string;

  @ApiProperty({ description: 'Combat phase that evaluated the rule', example: 'prepare' })
  phase: string;

  @ApiProperty({ description: 'Rule reference of the plugin', example: '§9.6', required: false })
  rule?: string;

  @ApiProperty({ description: 'Values the explanation shows', example: { position: 'flank' }, required: false, type: Object })
  params?: ModifierParams;

  static fromEntity(entity: SkippedRule): SkippedRuleDto {
    const dto = new SkippedRuleDto();
    dto.source = entity.source;
    dto.group = entity.group;
    dto.reason = entity.reason;
    dto.phase = entity.phase;
    dto.rule = entity.rule;
    dto.params = entity.params;
    return dto;
  }
}
