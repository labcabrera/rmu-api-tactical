import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MENTAL_FOCUS_OUTCOMES, type MentalFocusOutcome } from '../../../domain/value-objects/concentration-focus.vo.js';

/** Body of the alert resolution (workspace spec 077, decision A2.4): the outcome of a Mental Focus maneuver. */
export class ResolveAlertDto {
  @ApiPropertyOptional({
    enum: MENTAL_FOCUS_OUTCOMES,
    description: 'Outcome of a Mental Focus maneuver (mental-focus alerts): failed breaks every concentration of the actor',
  })
  @IsOptional()
  @IsIn(MENTAL_FOCUS_OUTCOMES)
  outcome?: MentalFocusOutcome;
}
