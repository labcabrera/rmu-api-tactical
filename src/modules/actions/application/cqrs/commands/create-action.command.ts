import type { MedicalDeclaration } from '../../services/medical/medical-action.service.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import type { OtherActionKind } from '../../../domain/value-objects/action-ap-profile.vo.js';
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
    /** The procedure of a `medical` action (workspace spec 068). */
    public readonly medical?: MedicalDeclaration,
    /** The item of a `use_item` action (workspace spec 068). */
    public readonly useItem?: CreateActionCommandUseItem,
    /** The declaration goes on despite its warnings that need a confirmation (workspace spec 068). */
    public readonly confirm?: boolean,
    /** The weapon of a `draw_and_load` action (workspace spec 076). */
    public readonly drawAndLoad?: CreateActionCommandDrawAndLoad,
    /** The foe and ranged weapon of an `aim` action (workspace spec 076). */
    public readonly aim?: CreateActionCommandAim,
    /** The fixed-cost subtype of an `other` action (workspace spec 079). */
    public readonly otherAction?: CreateActionCommandOther,
  ) {}
}

export class CreateActionCommandUseItem {
  itemId: string;
  targetActorId: string;
  roll?: number | null;
}

export class CreateActionCommandSpell {
  /** Code of the list in the caster's spellbook. */
  listCode: string;
  spellId: string;
}

export class CreateActionCommandForced {
  reason: ForceReason;
  note?: string;
  /** `reaction` (workspace spec 076): the `reaction-available` alert of the actor it is declared from. */
  alertId?: string;
}

export class CreateActionCommandOther {
  kind: OtherActionKind;
  attackName?: string;
}

export class CreateActionCommandAim {
  targetActorId: string;
  itemId: string;
}

export class CreateActionCommandDrawAndLoad {
  itemId?: string;
}

export class CreateActionCommandManeuver {
  skillId: string;
  /** Defaults to the skill's maneuver profile. */
  maneuverType?: ManeuverType;
  specialization?: string | null;
  /** Percent maneuver of an earlier action this one continues (§4.4 of spec 010). */
  continuesActionId?: string;
}
