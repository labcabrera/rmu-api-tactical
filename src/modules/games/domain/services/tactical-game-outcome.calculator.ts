import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { DYING, UNCONSCIOUS } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { HpLog } from '../../../actor-rounds/domain/value-objects/hp-log-entry.vo.js';
import { MAX_FATIGUE_PENALTY } from '../../../actor-rounds/domain/value-objects/actor-round-fatigue.vo.js';
import type { CharacterCondition, InjurySource } from '../../../actor-rounds/domain/value-objects/injury.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { HealingCombatRules } from '../../../actor-rounds/domain/value-objects/treatment-difficulty.vo.js';

/** Note of a treatment completed when the game ended (workspace spec 068, decision 4). */
export const COMPLETED_AFTER_COMBAT = 'completed-after-combat';
import { Game } from '../aggregates/game.js';
import type {
  ActorFate,
  AtRiskActor,
  TacticalGameOutcome,
  TacticalGameOutcomeCharacter,
  TacticalItemOutcome,
} from '../value-objects/tactical-game-outcome.vo.js';

/** What the finish dialog shows and the game finishes with. */
export interface FinishPreview {
  characters: TacticalGameOutcomeCharacter[];
  atRisk: AtRiskActor[];
}

/**
 * The outcome of a tactical game (spec 013, §3): for each character actor (NPCs are left out), its hits from the start
 * (the snapshot of the actor round built from the character) to its last round, its injuries by uuid and its final
 * conditions. The upkeep of the last round is not run (decision 3): the fate chosen for the characters at risk covers
 * bleeding and dying ones.
 */
export class TacticalGameOutcomeCalculator {
  static preview(game: Game, actorRounds: ActorRound[], rules?: HealingCombatRules | null): FinishPreview {
    const characters: TacticalGameOutcomeCharacter[] = [];
    const atRisk: AtRiskActor[] = [];
    for (const actor of game.actors.filter(each => each.type === 'character')) {
      const rounds = actorRounds.filter(each => each.actorId === actor.id).sort((a, b) => a.round - b.round);
      if (rounds.length === 0) {
        continue;
      }
      const last = rounds[rounds.length - 1];
      characters.push(TacticalGameOutcomeCalculator.character(game, rounds, undefined, rules));
      if (last.isAtRisk()) {
        const dying = last.effects.find(effect => effect.status === DYING);
        atRisk.push({
          actorId: actor.id,
          characterId: last.characterId ?? actor.id,
          name: last.actorName,
          bleeding: last.getBleeding(),
          dyingRounds: dying?.rounds ?? undefined,
        });
      }
    }
    return { characters, atRisk };
  }

  /** The outcome with the fates of the characters at risk; every one of them needs one (`err-finish-fate-required`). */
  static finish(game: Game, actorRounds: ActorRound[], fates: ActorFate[], rules?: HealingCombatRules | null): TacticalGameOutcome {
    const { atRisk } = TacticalGameOutcomeCalculator.preview(game, actorRounds, rules);
    const missing = atRisk.filter(actor => !fates.some(fate => fate.actorId === actor.actorId));
    if (missing.length > 0) {
      throw new ValidationError(`A fate is required for ${missing.map(actor => actor.name).join(', ')}`, 'err-finish-fate-required', {
        atRisk: missing,
      });
    }
    const characters = game.actors
      .filter(actor => actor.type === 'character')
      .map(actor => actorRounds.filter(each => each.actorId === actor.id).sort((a, b) => a.round - b.round))
      .filter(rounds => rounds.length > 0)
      .map(rounds => {
        const actorId = rounds[0].actorId;
        const fate = atRisk.some(actor => actor.actorId === actorId) ? fates.find(each => each.actorId === actorId)?.fate : undefined;
        return TacticalGameOutcomeCalculator.character(game, rounds, fate, rules);
      });
    return { finishedAt: new Date().toISOString(), characters };
  }

  private static character(
    game: Game,
    rounds: ActorRound[],
    fate: ActorFate['fate'] | undefined,
    rules?: HealingCombatRules | null,
  ): TacticalGameOutcomeCharacter {
    const first = rounds.find(each => !!each.snapshot) ?? rounds[0];
    const last = rounds[rounds.length - 1];
    TacticalGameOutcomeCalculator.completeTreatments(last, rules);
    const snapshot = first.snapshot;
    const start = snapshot?.hp ?? first.hp.current;
    const end = last.hp.current;
    const startInjuryIds = snapshot?.injuryIds ?? [];
    const startedAt = new Date(first.createdAt).toISOString();
    const injuries = last.injuries.map(injury => ({ ...injury, treatments: [...injury.treatments] }));
    const ids = new Set(injuries.map(injury => injury.id));
    const injuriesAdded = injuries.filter(injury => !startInjuryIds.includes(injury.id)).map(injury => injury.id);
    // An injury it brought and the game master removed is healed for the strategic model too.
    const injuriesHealed = [
      ...injuries.filter(injury => startInjuryIds.includes(injury.id) && injury.status === 'healed').map(injury => injury.id),
      ...startInjuryIds.filter(id => !ids.has(id)),
    ];
    const injuriesUpdated = injuries
      .filter(injury => startInjuryIds.includes(injury.id) && injury.status !== 'healed')
      .filter(injury => !!injury.updatedAt && injury.updatedAt >= startedAt)
      .map(injury => injury.id);
    const conditions = TacticalGameOutcomeCalculator.conditions(game, last, fate);
    // Every round keeps its own entries (spec 013, §1.1): the rounds are already in order.
    const hpLog = rounds.flatMap(round => (round.hpLog || []).map(entry => ({ ...entry })));
    const conditionsResolved = (snapshot?.conditionIds ?? []).filter(id => !conditions.some(condition => condition.id === id));
    const outcome: TacticalGameOutcomeCharacter = {
      actorId: last.actorId,
      characterId: last.characterId ?? last.actorId,
      name: last.actorName,
      hp: { start, end, delta: end - start },
      hpLog,
      hpBySource: HpLog.bySource(hpLog),
      injuries,
      injuriesAdded,
      injuriesUpdated,
      injuriesHealed,
      conditions,
      conditionsResolved,
      items: TacticalGameOutcomeCalculator.items(last),
      // Workspace spec 068, decisions 7 and 19: the items spent and the lasting modifiers created in this game
      itemsConsumed: (last.itemsConsumed ?? []).map(each => ({ ...each })),
      temporaryModifiers: (last.temporaryModifiers ?? []).filter(each => each.tacticalGameId === game.id).map(each => ({ ...each })),
    };
    // Workspace spec 077, decision D10: the fatigue it brought and the one it ends with (the critical one is left out).
    if (typeof snapshot?.fatigue === 'number') {
      const fatigueEnd = Math.min(MAX_FATIGUE_PENALTY, Math.max(0, last.fatigue?.fatigue ?? 0));
      outcome.fatigue = { start: snapshot.fatigue, end: fatigueEnd, delta: fatigueEnd - snapshot.fatigue };
    }
    if (fate) {
      outcome.fate = fate;
    }
    return outcome;
  }

  /**
   * Spec 019, decision 12: the modifiers the items got in the game, without the temporary ones, and the coatings spent
   * (workspace spec 042); items without either are left out.
   */
  /**
   * Workspace spec 068, decision 4: a treatment in progress when the game ends is completed, as if it were finished
   * after the combat, with the roll of its first round and the note `completed-after-combat` (no heat burn). Only the
   * actor round in memory changes: the outcome is computed from it.
   */
  private static completeTreatments(last: ActorRound, rules?: HealingCombatRules | null): void {
    for (const injury of last.injuries.filter(each => !!each.treatmentInProgress)) {
      try {
        last.completeTreatment(injury.treatmentInProgress!.actionId, { rules, note: COMPLETED_AFTER_COMBAT });
      } catch {
        // A treatment that is no longer valid for the injury is left out
        injury.treatmentInProgress = null;
      }
    }
  }

  private static items(last: ActorRound): TacticalItemOutcome[] {
    return (last.items || [])
      .map(item => {
        const outcome: TacticalItemOutcome = {
          itemId: item.itemId,
          name: item.name,
          modifiers: item.modifiers
            .filter(modifier => !item.startModifierIds.includes(modifier.id) && !modifier.temporary)
            .map(modifier => ({ ...modifier })),
        };
        // The appliedAt of the spent coating (spec 044, decision 3); a legacy round still says only `true`
        if (item.coatingSpent) outcome.coatingSpent = item.coatingSpent === true ? true : { appliedAt: item.coatingSpent.appliedAt };
        return outcome;
      })
      .filter(item => item.modifiers.length > 0 || item.coatingSpent);
  }

  /** Dead (by its effects or its fate), permanently unconscious (its fate) or unconscious at the end. */
  private static conditions(game: Game, last: ActorRound, fate: ActorFate['fate'] | undefined): CharacterCondition[] {
    const createdAt = new Date().toISOString();
    const fallback: InjurySource = { kind: 'manual', tacticalGameId: game.id, tacticalGameName: game.name, round: last.round };
    const dead = last.effects.find(effect => effect.status === 'dead');
    if (dead || fate === 'dead') {
      return [
        { id: dead?.id ?? randomUUID(), status: 'dead', source: TacticalGameOutcomeCalculator.sourceOf(dead?.source, fallback), createdAt },
      ];
    }
    if (fate === 'permanent-unconscious') {
      const cause = last.effects.find(effect => effect.status === DYING || effect.status === UNCONSCIOUS);
      return [
        {
          id: randomUUID(),
          status: 'permanent-unconscious',
          source: TacticalGameOutcomeCalculator.sourceOf(cause?.source, fallback),
          createdAt,
        },
      ];
    }
    return last.effects
      .filter(effect => effect.status === UNCONSCIOUS)
      .slice(0, 1)
      .map(effect => ({
        id: effect.id,
        status: 'unconscious',
        source: TacticalGameOutcomeCalculator.sourceOf(effect.source, fallback),
        createdAt,
      }));
  }

  private static sourceOf(source: InjurySource | undefined, fallback: InjurySource): InjurySource {
    return source ? { ...source } : fallback;
  }
}
