import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
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
      'death-threshold alert (the actor dies; without it the alert is dismissed)',
  })
  @IsOptional()
  @IsIn(ALERT_OUTCOMES)
  outcome?: AlertOutcome;
}
