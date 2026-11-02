import type { AttackLocation } from '../../../../actions/domain/value-objects/attack-location.vo.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { EffectApplication } from '../../../domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../domain/value-objects/actor-round-effect.vo.js';
import type { HpChange } from '../../../domain/value-objects/hp-log-entry.vo.js';
import type { Injury, InjurySource } from '../../../domain/value-objects/injury.vo.js';
import type { PoisonData } from '../../../domain/value-objects/poison.vo.js';

/**
 * Command to apply changes to HP and add status effects to an actor round.
 */
export class AddEffectsCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public dmg: number,
    public readonly effects: ActorRoundEffect[],
    public location: AttackLocation | undefined,
    userId: string,
    roles: string[],
    /** When the effects land. Without it, the handler takes the game's current phase and the actor's phase log. */
    public readonly application?: EffectApplication,
    /** Effects of the actor used up, removed before the new ones are added. */
    public readonly consumedEffectIds: string[] = [],
    /** Injuries of the criticals and fumbles (spec 013, §3). */
    public readonly injuries: Injury[] = [],
    /** Hits healed, up to the maximum (a critical that heals the attacker). */
    public heal = 0,
    /**
     * Where the hits of `dmg` (negative amounts) and `heal` (positive) come from, for the hits log (spec 013, §1.1).
     * Hits of `dmg` not accounted for are logged as a game master adjustment.
     */
    public readonly hpChanges: HpChange[] = [],
    /** The attack of a fumble of the actor: its item takes the breakage roll of the fumble (spec 019). */
    public fumbleAttackName?: string,
    /** Severities of the criticals the actor's fumbles give it, for the game master to roll (spec 034). */
    public readonly fumbleCriticals: string[] = [],
    /** Poisons of coated weapons that reached the actor with a critical (workspace spec 042, decision 11). */
    public readonly poisonExposures: { poison: PoisonData; source: InjurySource }[] = [],
  ) {
    super(userId, roles);
  }
}
