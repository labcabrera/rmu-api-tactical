import type { ActionSpellOptions, SpellRealm, SpellTargetConditions } from '../../../domain/value-objects/action-spell.vo.js';

/** `PATCH :id/spell/roll`: the Spellcasting Roll with its choices (spec 030, decisions 6-9). */
export class RollSpellCommand {
  constructor(
    public readonly actionId: string,
    public readonly options: Partial<ActionSpellOptions>,
    /** Open-ended roll. */
    public readonly roll: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `PATCH :id/spell/failure-roll`: the spell failure roll of a negative SCR (decision 11). */
export class RollSpellFailureCommand {
  constructor(
    public readonly actionId: string,
    public readonly roll: number,
    /** Table of a hybrid list, chosen before rolling; the first realm of the list by default. */
    public readonly realm: SpellRealm | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export interface SpellTargetRoll {
  actorId: string;
  /** Open-ended roll; not needed by a willing target of a Utility spell. */
  roll?: number;
  conditions?: SpellTargetConditions;
  /** RR bonus of a target without a sheet (NPC). */
  bonus?: number;
}

/** `PATCH :id/spell/resistance-rolls`: the RR of every target of a successful cast (decision 14). */
export class ResolveSpellResistanceCommand {
  constructor(
    public readonly actionId: string,
    public readonly targets: SpellTargetRoll[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `PATCH :id/spell/apply`: spends the power points and closes the cast (decision 10). */
export class ApplySpellCommand {
  constructor(
    public readonly actionId: string,
    /** Power points to spend; by default the spell's, or what the spell failure result suggests. */
    public readonly powerPoints: number | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `POST :id/spell/preview`: the SCR modifiers of some choices, nothing stored. */
export class PreviewSpellQuery {
  constructor(
    public readonly actionId: string,
    public readonly options: Partial<ActionSpellOptions>,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
