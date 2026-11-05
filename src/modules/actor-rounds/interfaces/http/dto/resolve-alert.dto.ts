import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { BodySide } from '../../../domain/value-objects/injury.vo.js';
import { ALERT_OUTCOMES, type AlertOutcome } from '../../../domain/value-objects/actor-round-alert.vo.js';

/**
 * Body of the alert resolution: the outcome of a Mental Focus maneuver (workspace spec 077, decision A2.4), or the
 * confirmation of a death-threshold alert (workspace spec 079, decision A3).
 */
export class ResolveAlertDto {
  @ApiPropertyOptional({
    enum: ALERT_OUTCOMES,
    description:
      'passed/failed of a Mental Focus maneuver (failed breaks every concentration of the actor); confirmed of a ' +
      'death-threshold alert (the actor dies) or of a limb-loss alert (the limb is lost, spec 079); without it the alert is ' +
      'dismissed',
  })
  @IsOptional()
  @IsIn(ALERT_OUTCOMES)
  outcome?: AlertOutcome;

  @ApiPropertyOptional({
    enum: ['left', 'right'],
    description: 'Confirmed limb-loss alert (spec 079): the side of the limb when its injury has none',
  })
  @IsOptional()
  @IsIn(['left', 'right'])
  side?: BodySide;
}
