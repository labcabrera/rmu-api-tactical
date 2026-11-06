import type { ManeuverPurpose } from '../../../domain/value-objects/maneuver-purpose.vo.js';
import type { SkillAidChoices } from '../../services/maneuver/maneuver-context.service.js';
import type { FeatOfStrengthChoices } from '../../../domain/services/feat-of-strength.js';

/** Workspace spec 079, block B: what the maneuver is for and its aids, which change the listing. */
export interface ManeuverListingChoices extends SkillAidChoices {
  purpose?: ManeuverPurpose;
  featOfStrength?: FeatOfStrengthChoices;
}

export class GetManeuverModifiersQuery {
  constructor(
    public readonly actionId: string,
    /** Skill to roll with instead of the declared one. */
    public readonly skillId: string | undefined,
    public readonly specialization: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
    public readonly choices: ManeuverListingChoices = {},
  ) {}
}
