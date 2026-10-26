import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import type { ForceReason } from '../../../domain/value-objects/action-resolution.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';

export class CreateActionCommand {
  constructor(
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly actionType: ActionType,
    public readonly freeAction: boolean,
    public readonly phaseStart: number,
    public readonly maneuver: CreateActionCommandManeuver | undefined,
    public readonly description: string,
    public readonly userId: string,
    public readonly roles: string[],
    /** A new action forced out of turn (spec 011, §6): an effect or the game master. */
    public readonly forced?: CreateActionCommandForced,
    /** The spell of a `cast_spell` action (spec 030). */
    public readonly spell?: CreateActionCommandSpell,
  ) {}
}

export class CreateActionCommandSpell {
  /** Code of the list in the caster's spellbook. */
  listCode: string;
  spellId: string;
}

export class CreateActionCommandForced {
  reason: ForceReason;
  note?: string;
}

export class CreateActionCommandManeuver {
  skillId: string;
  /** Defaults to the skill's maneuver profile. */
  maneuverType?: ManeuverType;
  specialization?: string | null;
  /** Percent maneuver of an earlier action this one continues (§4.4 of spec 010). */
  continuesActionId?: string;
}
