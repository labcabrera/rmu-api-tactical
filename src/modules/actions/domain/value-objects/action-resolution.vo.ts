/**
 * Why an action is resolved out of its turn (spec 011, §6). `reaction` (workspace spec 076, decision B1): the attack of
 * a reaction talent (Riposte, Opportunistic Strike), declared from its `reaction-available` alert or by the game master.
 */
export type ForceReason = 'withdrawal' | 'pass-through' | 'effect' | 'gm' | 'reaction' | 'stray-shot';

/** `stray-shot` (workspace spec 079, decision A6): the second attack of a shot into a melee that missed (§9.7). */
export const FORCE_REASONS: ForceReason[] = ['withdrawal', 'pass-through', 'effect', 'gm', 'reaction', 'stray-shot'];

/** Forced without AP nor AP penalty: an effect, a reaction or a stray shot. */
export const isApFreeReason = (reason: ForceReason | undefined): boolean =>
  reason === 'effect' || reason === 'reaction' || reason === 'stray-shot';

/**
 * Where the AP of a forced action come from: the next free AP of the actor (`next-phase`), none (`none`) or the ones
 * already spent (`as-spent`).
 */
export type ForcedApSource = 'next-phase' | 'none' | 'as-spent';

export type ResolutionMode = 'normal' | 'forced';

/** How an action is resolved: normally, or forced out of its turn with a reason. */
export class ActionResolution {
  constructor(
    public readonly mode: ResolutionMode,
    public readonly reason?: ForceReason,
    public readonly apSource?: ForcedApSource,
    public readonly note?: string,
  ) {}

  static normal(): ActionResolution {
    return new ActionResolution('normal');
  }

  static forced(reason: ForceReason, note?: string): ActionResolution {
    return new ActionResolution('forced', reason, ActionResolution.apSourceOf(reason), note);
  }

  /** Withdrawal and passing through take the next free AP; an effect or a reaction none; the game master, the ones spent. */
  static apSourceOf(reason: ForceReason): ForcedApSource {
    switch (reason) {
      case 'withdrawal':
      case 'pass-through':
        return 'next-phase';
      case 'effect':
      case 'reaction':
      case 'stray-shot':
        return 'none';
      case 'gm':
      default:
        return 'as-spent';
    }
  }
}
