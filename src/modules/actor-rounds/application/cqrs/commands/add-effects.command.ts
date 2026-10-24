import { AttackLocation } from '../../../../actions/domain/value-objects/attack-location.vo';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import type { EffectApplication } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import type { HpChange } from '../../../domain/value-objets/hp-log-entry.vo';
import type { Injury } from '../../../domain/value-objets/injury.vo';

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
  ) {
    super(userId, roles);
  }
}
