import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';

export class DeclareParryCommand {
  constructor(
    public readonly actionId: string,
    public readonly parries: DeclareParryItem[],
    public readonly userId: string,
    public readonly roles: string[],
    /** Workspace spec 077, decision A1.3: the Shield maneuvers of the defenders, one per attack that needs it. */
    public readonly shieldManeuvers: DeclareShieldManeuverItem[] = [],
  ) {}
}

export class DeclareParryItem {
  constructor(
    public readonly parryId: string,
    public readonly parry: number,
    /**
     * Workspace spec 079, decision A2: result of the absolute Combat Training maneuver of a parry against a further foe
     * of the round (`absolute-failure`...`absolute-success`), required when the parry needs it and gives any OB.
     */
    public readonly maneuverResult?: string,
  ) {}
}

/**
 * The Shield maneuver against an attack (workspace spec 077, decisions A1.3-A1.4): the defender's roll and the
 * difficulty (medium when missing), or the game master's `passed` without a roll.
 */
export class DeclareShieldManeuverItem {
  constructor(
    public readonly attackName: string,
    public readonly roll?: number,
    public readonly difficulty?: Difficulty,
    public readonly passed?: boolean,
  ) {}
}
