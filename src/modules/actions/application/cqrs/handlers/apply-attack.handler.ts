import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { AddEffectsCommand } from '../../../../actor-rounds/application/cqrs/commands/add-effects.command.js';
import { AddFatigueCommand } from '../../../../actor-rounds/application/cqrs/commands/add-fatigue.command.js';
import { DeclareActorParryCommand } from '../../../../actor-rounds/application/cqrs/commands/declare-actor-parry.command.js';
import { SubstractBoCommand } from '../../../../actor-rounds/application/cqrs/commands/substract-bo.command.js';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound, type EffectApplication } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import {
  ActorRoundEffect,
  ARM_USELESS,
  CANNOT_PARRY,
  HALF_ACTIVITY,
  HALF_MOVEMENT,
  INITIATIVE_PENALTY,
  NON_VIOLENT,
  PRESSING_ADVANTAGE,
  UNCONSCIOUS,
} from '../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import {
  ActorRoundTrait,
  NON_VIOLENT_TRAIT,
  PAIN_RESISTANCE,
  PRESSING_THE_ADVANTAGE,
  RAPID_BLEEDER,
  SLOW_BLEEDER,
  STUN_RESISTANCE,
} from '../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { type CriticalEffectData, CriticalInjuryFactory } from '../../../../actor-rounds/domain/services/critical-injury.factory.js';
import type { HpChange } from '../../../../actor-rounds/domain/value-objects/hp-log-entry.vo.js';
import { type InjurySource, sideOfRoll } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type StrategicGame, STRATEGIC_GAME_PORT } from '../../../../strategic/application/ports/strategic-game.port.js';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api.strategic-game.adapter.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ADDITIONAL_CRITICAL, FUMBLE_HITS } from '../../../domain/services/fumble-hits.js';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo.js';
import type { CriticalEffect } from '../../../domain/value-objects/critical-result.vo.js';
import type { AttackLocation } from '../../../domain/value-objects/attack-location.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ApplyAttackCommand } from '../commands/apply-attack.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { SpellCastingService } from '../../services/spell/spell-casting.service.js';

/** Location of a critical table result (limbs in singular) as an attack location. */
const toAttackLocation = (location: string | undefined | null): AttackLocation | undefined => {
  const value = location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  return (['head', 'chest', 'abdomen', 'arms', 'legs'] as AttackLocation[]).find(candidate => candidate === value);
};

/** What the injuries and effects of an attack need to know of where they come from (spec 013, §3). */
interface AttackOrigin {
  game: Game;
  action: Action;
  sourceActor: ActorRound;
}

const HEAL = 'heal';
/** A useless limb of the critical texts (spec 034): an arm is `arm_useless`, a leg half movement. */
const LIMB_USELESS = 'limb_useless';
/**
 * Effects that start `delay` rounds later (spec 034): those of the critical texts and the unconsciousness of a hold
 * (G-B 98: "unconscious in six more rounds"). The delayed stuns follow the worst one.
 */
const DELAYED_STATUSES = [HALF_ACTIVITY, CANNOT_PARRY, INITIATIVE_PENALTY, UNCONSCIOUS];

/** OB bonus per tier of Pressing the Advantage. */
const PRESSING_BONUS_PER_TIER = 10;

/** Penalty per tier of Non-violent (Character Companion, workspace spec 039). */
const NON_VIOLENT_PENALTY_PER_TIER = -5;

/** Pain Resistance (workspace spec 039): each hit damage taken is reduced by 1 per tier, never below 1. */
const reducePainDamage = (damage: number, tier: number): number => (damage > 0 && tier > 0 ? Math.max(1, damage - tier) : damage);

/** Stun Resistance (workspace spec 039): a Stun[-75] counts as Stun[-50] and a Stun[-50] as Stun[-25]. */
const reduceStuns = (effects: CriticalEffect[], stunResistance: boolean): CriticalEffect[] =>
  stunResistance ? effects.map(e => (e.status === 'stunned' && (e.value ?? 0) <= -50 ? { ...e, value: (e.value ?? 0) + 25 } : e)) : effects;

@CommandHandler(ApplyAttackCommand)
export class ApplyAttackHandler implements ICommandHandler<ApplyAttackCommand, Action> {
  private readonly logger = new Logger(ApplyAttackHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGamePort: StrategicGameApiClient,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly commandBus: CommandBus,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: ApplyAttackCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    const strategicGame = await this.strategicGamePort.findById(game.strategicGameId);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    action.checkValidApplyResults();
    const actionAttacks = action.attacks!;
    const actorRoundIds = Array.from(new Set(actionAttacks.map(a => a.modifiers.targetId).concat([action.actorId])));
    const rsql = `gameId==${action.gameId};round==${game.round};actorId=in=(${actorRoundIds.join(',')})`;
    const actors = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
    if (actorRoundIds.length !== actors.length) {
      throw new NotFoundError('Actor rounds', `${actorRoundIds.join(', ')} in round ${game.round}`);
    }
    // An attack spell takes its power points when its attack is applied (spec 030, phase 4); first, in case the caster
    // has no longer enough.
    const sourceRound = actors.find(a => a.actorId === action.actorId)!;
    if (action.actionType === 'cast_spell') await this.spendSpellPower(action, sourceRound);
    // A spell is not a weapon: no OB of the actor round is used.
    const substractBoCommands =
      action.actionType === 'cast_spell' ? [] : this.processAttackSourceSubstractBo(action, actors, command.userId, command.roles);
    // One after another: two attacks of the same attacker update the same actor round, and each command reloads it.
    for (const cmd of substractBoCommands) {
      await this.commandBus.execute(cmd);
    }

    const sourceActor = actors.find(a => a.actorId === action.actorId)!;
    const applications = await this.readEffectApplications(action, actors, game.round, game.getActionPhase());

    const updateCommands = new Map<string, AddEffectsCommand>();
    const origin: AttackOrigin = { game, action, sourceActor };
    actionAttacks.forEach(actionAttack => {
      this.processTargetEffects(actionAttack, actors, origin, applications, updateCommands, command.userId, command.roles);
      this.processSourceEffects(actionAttack, origin, applications, updateCommands, command.userId, command.roles);
    });
    this.processSourceTalents(action, sourceActor, game.round, applications, updateCommands, command.userId, command.roles);
    const coatingsSpent = this.processCoatings(actionAttacks, actors, origin, applications, updateCommands, command.userId, command.roles);

    // Apply all effects and damages sinchronously to avoid multiple updates
    for (const cmd of updateCommands.values()) {
      await this.commandBus.execute<AddEffectsCommand, void>(cmd);
    }

    await this.useShieldBlocks(action, actors);
    await this.spendCoatings(sourceActor.id, coatingsSpent);
    await this.processDeclareActorParry(action, command.userId, command.roles);
    await this.processFatigue(action, game.round, strategicGame, command.userId, command.roles);

    // The AP and the last phase of the attack come from the ledger (spec 011, §9).
    action.completeAttacks();
    action.close(sourceActor, game.getActionPhase());
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(sourceActor, game.getActionPhase());
    return updated;
  }

  /**
   * When the effects land on each actor: the current phase and the AP spent in the round, from the phase log plus the
   * actions completed in this phase. The attacker has spent the AP of the attack being applied.
   */
  private async readEffectApplications(
    action: Action,
    actors: ActorRound[],
    round: number,
    phase: number,
  ): Promise<Map<string, EffectApplication>> {
    const rsql = `gameId==${action.gameId};round==${round};actorId=in=(${actors.map(a => a.actorId).join(',')})`;
    const roundActions = (await this.actionRepository.findByRsql(rsql, 0, 1000)).content;
    const applications = new Map<string, EffectApplication>();
    actors.forEach(actor => {
      const actorActions = roundActions.filter(a => a.actorId === actor.actorId && a.id !== action.id);
      let spentInPhase = Action.completedApInPhase(actorActions, phase);
      if (actor.actorId === action.actorId && !action.freeAction && (action.actionPoints ?? 0) > 0) {
        spentInPhase = 1;
      }
      applications.set(actor.id, { phase, spentAp: actor.getSpentAp(phase, spentInPhase) });
    });
    return applications;
  }

  private async spendSpellPower(action: Action, sourceActor: ActorRound): Promise<void> {
    const spell = action.spell!;
    if (spell.powerPointsSpent !== null && spell.powerPointsSpent !== undefined) return;
    const spellcasting = await this.spellCasting.readSpellcasting(sourceActor);
    const amount = spell.spell.powerPoints;
    const current = spellcasting.power?.current ?? 0;
    if (amount > current) {
      throw new ValidationError(`The caster has ${current} power points, not ${amount}`, 'err-insufficient-power');
    }
    if (amount > 0) await this.spellCasting.spendPower(sourceActor, amount);
    spell.powerPointsSpent = amount;
  }

  private processAttackSourceSubstractBo(action: Action, actors: ActorRound[], userId: string, roles: string[]): SubstractBoCommand[] {
    const actorRound = actors.find(a => a.actorId === action.actorId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', action.actorId);
    }
    const substractBoCommands: SubstractBoCommand[] = [];
    action.attacks?.forEach(a => {
      const attack = action.getAttackByName(a.attackName);
      if (!attack) {
        throw new UnprocessableEntityError(`Attack ${a.attackName} not found`);
      }
      if (attack.modifiers.bo! > 0) {
        substractBoCommands.push(new SubstractBoCommand(actorRound.id, a.attackName, attack.modifiers.bo!, userId, roles));
      }
    });
    return substractBoCommands;
  }

  /**
   * Spends a shield block of the target for each attack its shield covered (§9.6 Shields). The actor round is read
   * again, since the effects of this attack were already saved. A block already spent by an attack applied in the
   * meantime is not spent twice.
   */
  private async useShieldBlocks(action: Action, actors: ActorRound[]): Promise<void> {
    const blocks = new Map<string, number>();
    action.attacks
      ?.filter(attack => attack.calculated?.rollModifiers.some(modifier => modifier.key === 'shield' || modifier.key === 'shield-block'))
      .forEach(attack => blocks.set(attack.modifiers.targetId!, (blocks.get(attack.modifiers.targetId!) || 0) + 1));
    for (const [targetId, count] of blocks) {
      const id = actors.find(a => a.actorId === targetId)?.id;
      const target = id ? await this.actorRoundRepository.findById(id) : null;
      if (!target) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        if (!target.hasShieldBlocksLeft()) {
          this.logger.warn(`Shield of ${targetId} has no blocks left for action ${action.id}`);
          break;
        }
        target.useShieldBlock();
      }
      await this.actorRoundRepository.update(target);
    }
  }

  /**
   * Workspace spec 042, decision 11: an attack with a coated weapon that hits spends the coating; with a critical, the
   * target is exposed to the poison (it waits for its RR). Returns the items whose coating was spent.
   */
  private processCoatings(
    actionAttacks: ActionAttack[],
    actors: ActorRound[],
    origin: AttackOrigin,
    applications: Map<string, EffectApplication>,
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ): string[] {
    const spent: string[] = [];
    actionAttacks.forEach(actionAttack => {
      const coated = origin.sourceActor.attackCoating(actionAttack.attackName);
      if (!coated || spent.includes(coated.itemId)) return;
      const criticals = actionAttack.results?.criticals ?? [];
      const hit = (actionAttack.results?.attackTableEntry?.damage ?? 0) > 0 || criticals.length > 0;
      if (!hit) return;
      spent.push(coated.itemId);
      const target = actors.find(a => a.actorId === actionAttack.modifiers.targetId);
      if (!target || criticals.length === 0) return;
      const first = criticals[0];
      const source = this.sourceOf(origin, 'critical', `${first.criticalType}-${first.criticalSeverity}-${first.adjustedRoll ?? ''}`);
      this.commandFor(target, applications, updateCommands, userId, roles).poisonExposures.push({ poison: coated.coating.poison, source });
    });
    return spent;
  }

  /** The coatings spent, on the attacker's actor round read again (the effects of the attack were already saved). */
  private async spendCoatings(sourceRoundId: string, itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const source = await this.actorRoundRepository.findById(sourceRoundId);
    if (!source) return;
    itemIds.forEach(itemId => source.spendCoating(itemId));
    await this.actorRoundRepository.update(source);
  }

  private async processDeclareActorParry(action: Action, userId: string, roles: string[]): Promise<void> {
    if (!action.parries || action.parries.length === 0) {
      return;
    }
    // A parry carried over from an earlier action against this foe was already paid.
    for (const parry of action.parries.filter(p => p.parry > 0 && !p.carriedOver)) {
      const command = DeclareActorParryCommand.fromParry(action.gameId, action.actorId, action.round, parry, userId, roles);
      await this.commandBus.execute(command);
    }
  }

  /** The source of the injuries and effects of an attack. */
  private sourceOf(origin: AttackOrigin, kind: 'critical' | 'fumble', criticalKey?: string): InjurySource {
    const source: InjurySource = {
      kind,
      tacticalGameId: origin.game.id,
      tacticalGameName: origin.game.name,
      actionId: origin.action.id,
      round: origin.game.round,
      attackerId: origin.sourceActor.actorId,
      attackerName: origin.sourceActor.actorName,
    };
    if (criticalKey) {
      source.criticalKey = criticalKey;
    }
    return source;
  }

  /** What the hits log of an actor round keeps of the attack a change of hits comes from (spec 013, §1.1). */
  private hpOrigin(origin: AttackOrigin, withAttacker: boolean): Pick<HpChange, 'actionId' | 'attackerId' | 'attackerName'> {
    if (!withAttacker) {
      return { actionId: origin.action.id };
    }
    return { actionId: origin.action.id, attackerId: origin.sourceActor.actorId, attackerName: origin.sourceActor.actorName };
  }

  /**
   * Spec 013, §3: each critical with penalty or bleeding is an injury of the target (Slow and Rapid Bleeder: each new
   * bleeding wound bleeds one less or one more per tier); its other effects keep its source. The effects that fall on
   * the attacker (`applyTo: source`, a critical that heals it) go to the attacker. The location of the critical goes
   * with the effects, for the breakage alerts. The hits are logged by origin (spec 013, §1.1): the attack table damage
   * and each critical apart, and the healing of the attacker as a treatment.
   */
  private processTargetEffects(
    actionAttack: ActionAttack,
    actors: ActorRound[],
    origin: AttackOrigin,
    applications: Map<string, EffectApplication>,
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ) {
    const target = actors.find(a => a.actorId === actionAttack.modifiers.targetId);
    if (!target) {
      throw new NotFoundError('Actor round', actionAttack.modifiers.targetId ?? 'of the target');
    }
    let dmg = 0;
    let sourceHeal = 0;
    const painTier = ActorRoundTrait.tierOf(target.traits, PAIN_RESISTANCE);
    dmg += reducePainDamage(actionAttack.results?.attackTableEntry?.damage || 0, painTier);
    const hpChanges: HpChange[] = [{ kind: 'attack', amount: -dmg, ...this.hpOrigin(origin, true) }];
    const sourceHeals: HpChange[] = [];
    const criticalEffects: ActorRoundEffect[] = [];
    const injuries: AddEffectsCommand['injuries'] = [];
    const bleedingShift = ActorRoundTrait.tierOf(target.traits, RAPID_BLEEDER) - ActorRoundTrait.tierOf(target.traits, SLOW_BLEEDER);
    const side = sideOfRoll(actionAttack.roll?.roll);
    let location: AttackLocation | undefined = actionAttack.calculated?.location;
    actionAttack.results?.criticals?.forEach(cr => {
      const criticalDmg = reducePainDamage(cr.result?.damage || 0, painTier);
      dmg += criticalDmg;
      location = location ?? toAttackLocation(cr.result?.location);
      const criticalKey = `${cr.criticalType}-${cr.criticalSeverity}-${cr.adjustedRoll ?? ''}`;
      const source = this.sourceOf(origin, 'critical', criticalKey);
      hpChanges.push({ kind: 'critical', amount: -criticalDmg, criticalKey, ...this.hpOrigin(origin, true) });
      const toSource = (cr.result?.effects || []).filter(e => e.applyTo === 'source');
      const heal = toSource.filter(e => e.status === HEAL).reduce((sum, e) => sum + Math.max(0, e.value ?? 0), 0);
      sourceHeal += heal;
      sourceHeals.push({ kind: 'treatment', amount: heal, criticalKey, ...this.hpOrigin(origin, false) });
      const built = CriticalInjuryFactory.build({
        effects: reduceStuns(
          (cr.result?.effects || []).filter(e => e.applyTo !== 'source'),
          ActorRoundTrait.tierOf(target.traits, STUN_RESISTANCE) > 0,
        ),
        criticalType: cr.criticalType,
        location: cr.result?.location,
        side,
        injury: cr.result?.injury,
        bleedingShift,
        source,
      });
      injuries.push(...built.injuries);
      criticalEffects.push(...this.toRoundEffects(built.effects, source, origin.game.round));
    });
    if (sourceHeal > 0) {
      const sourceCmd = this.commandFor(origin.sourceActor, applications, updateCommands, userId, roles);
      sourceCmd.heal += sourceHeal;
      sourceCmd.hpChanges.push(...sourceHeals.filter(change => change.amount > 0));
    }
    if (dmg === 0 && criticalEffects.length === 0 && injuries.length === 0) {
      return;
    }
    const cmd = this.commandFor(target, applications, updateCommands, userId, roles);
    cmd.dmg += dmg || 0;
    cmd.hpChanges.push(...hpChanges.filter(change => change.amount !== 0));
    cmd.effects.push(...criticalEffects);
    cmd.injuries.push(...injuries);
    cmd.location = cmd.location ?? location;
  }

  /** The effects command of an actor round, created the first time. */
  private commandFor(
    actor: ActorRound,
    applications: Map<string, EffectApplication>,
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ): AddEffectsCommand {
    let cmd = updateCommands.get(actor.id);
    if (!cmd) {
      cmd = new AddEffectsCommand(actor.id, 0, [], undefined, userId, roles, applications.get(actor.id));
      updateCommands.set(actor.id, cmd);
    }
    return cmd;
  }

  /** A fumble: its penalty and bleeding are an injury of the attacker (spec 013, §3), the rest effects. */
  private processSourceEffects(
    actionAttack: ActionAttack,
    origin: AttackOrigin,
    applications: Map<string, EffectApplication>,
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ) {
    if (!actionAttack.results?.fumble) {
      return;
    }
    const actor = origin.sourceActor;
    const fumble = actionAttack.results.fumble;
    const source = this.sourceOf(origin, 'fumble');
    const bleedingShift = ActorRoundTrait.tierOf(actor.traits, RAPID_BLEEDER) - ActorRoundTrait.tierOf(actor.traits, SLOW_BLEEDER);
    // Spec 034: the hits of the entry are already in its damage, and an additional critical is an alert.
    const fumbleCriticals = (fumble.effects || []).filter(e => e.status === ADDITIONAL_CRITICAL && e.severity).map(e => e.severity!);
    const built = CriticalInjuryFactory.build({
      effects: (fumble.effects || []).filter(e => e.status !== FUMBLE_HITS && e.status !== ADDITIONAL_CRITICAL),
      side: sideOfRoll(actionAttack.roll?.roll),
      bleedingShift,
      source,
    });
    const effects = this.toRoundEffects(built.effects, source, origin.game.round);
    const dmg = fumble.damage || 0;
    if (dmg === 0 && effects.length === 0 && built.injuries.length === 0 && fumbleCriticals.length === 0) {
      return;
    }
    const cmd = this.commandFor(actor, applications, updateCommands, userId, roles);
    cmd.dmg += dmg;
    if (dmg !== 0) {
      cmd.hpChanges.push({ kind: 'fumble', amount: -dmg, ...this.hpOrigin(origin, false) });
    }
    cmd.effects.push(...effects);
    cmd.injuries.push(...built.injuries);
    cmd.fumbleCriticals.push(...fumbleCriticals);
    cmd.fumbleAttackName = actionAttack.attackName;
  }

  /**
   * The effects of a critical or fumble as effects of the actor round (spec 034): a useless arm is `arm_useless` and a
   * useless leg half movement, and the delayed effects of the texts start `delay` rounds after this one.
   */
  private toRoundEffects(effects: CriticalEffectData[], source: InjurySource, round: number): ActorRoundEffect[] {
    return effects.map(e => {
      const status = e.status === LIMB_USELESS ? (e.location === 'leg' ? HALF_MOVEMENT : ARM_USELESS) : e.status;
      const fromRound = e.delay && DELAYED_STATUSES.includes(status) ? round + e.delay : undefined;
      return new ActorRoundEffect(randomUUID(), status, e.value, e.rounds, undefined, undefined, undefined, undefined, source, fromRound);
    });
  }

  /**
   * Effects of the attacker's talents once its attacks are applied. A `pressing-advantage` against a foe of this
   * action is used up; inflicting a critical with a melee attack gives a new one (Pressing the Advantage) and a penalty
   * to its attacks for the rest of the combat (Non-violent).
   */
  private processSourceTalents(
    action: Action,
    actor: ActorRound,
    round: number,
    applications: Map<string, EffectApplication>,
    updateCommands: Map<string, AddEffectsCommand>,
    userId: string,
    roles: string[],
  ) {
    const targetIds = new Set((action.attacks || []).map(attack => attack.modifiers.targetId));
    const consumed = (actor.effects || [])
      .filter(effect => effect.status === PRESSING_ADVANTAGE && !!effect.targetActorId && targetIds.has(effect.targetActorId))
      .map(effect => effect.id);
    const effects: ActorRoundEffect[] = [];
    const inflicting = (action.attacks || []).filter(attack => (attack.results?.criticals?.length || 0) > 0);
    const pressing = inflicting
      .filter(attack => attack.type === 'melee')
      .map(attack => {
        const skillId = actor.attacks?.find(a => a.attackName === attack.attackName)?.skillId;
        const tier = ActorRoundTrait.tierForSkill(actor.traits, PRESSING_THE_ADVANTAGE, skillId);
        return { targetId: attack.modifiers.targetId, tier };
      })
      .filter(entry => entry.tier > 0)
      .pop();
    if (pressing) {
      effects.push(
        new ActorRoundEffect(
          randomUUID(),
          PRESSING_ADVANTAGE,
          PRESSING_BONUS_PER_TIER * pressing.tier,
          undefined,
          round,
          undefined,
          undefined,
          pressing.targetId,
        ),
      );
    }
    const nonViolent = ActorRoundTrait.tierOf(actor.traits, NON_VIOLENT_TRAIT);
    if (nonViolent > 0 && inflicting.length > 0) {
      effects.push(new ActorRoundEffect(randomUUID(), NON_VIOLENT, NON_VIOLENT_PENALTY_PER_TIER * nonViolent, undefined, round));
    }
    if (effects.length === 0 && consumed.length === 0) {
      return;
    }
    const cmd = this.commandFor(actor, applications, updateCommands, userId, roles);
    cmd.effects.push(...effects);
    cmd.consumedEffectIds.push(...consumed);
  }

  private async processFatigue(
    action: Action,
    round: number,
    strategicGame: StrategicGame,
    userId: string,
    roles: string[],
  ): Promise<void> {
    const multiplier = strategicGame.options?.fatigueMultiplier ?? 1;
    action.processFatigue(multiplier);
    if (action.fatigue) {
      const command = new AddFatigueCommand(undefined, action.gameId, action.actorId, round, action.fatigue, userId, roles);
      await this.commandBus.execute(command);
    }
  }
}
