import { Inject, Injectable } from '@nestjs/common';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import {
  type CharacterKnownSpell,
  type CharacterKnownSpellList,
  type CharacterMagicPort,
  type CharacterSpellcasting,
  CHARACTER_MAGIC_PORT,
} from '../../../../strategic/application/ports/character-magic.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { castingSpellType, needsPreparation, scrModifiers } from '../../../domain/services/spell-casting.rules.js';
import {
  type ActionSpell,
  type ActionSpellOptions,
  DEFAULT_SPELL_OPTIONS,
  SPELL_REALMS,
  type SpellRealm,
} from '../../../domain/value-objects/action-spell.vo.js';
import type { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type SpellcastingTablesPort, SPELLCASTING_TABLES_PORT } from '../../ports/spellcasting-tables.port.js';

/** A spell action with its game, current phase and caster round, read once per request. */
export interface SpellActionContext {
  action: Action;
  spell: ActionSpell;
  game: Game;
  currentPhase: number;
  actorRound: ActorRound;
}

export interface ScrCalculation {
  options: ActionSpellOptions;
  modifiers: KeyValueModifier[];
  /** Sum of the modifiers: the SCR is the roll plus this. */
  bonus: number;
}

/** Declaring and resolving `cast_spell` actions (spec 030). */
@Injectable()
export class SpellCastingService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(CHARACTER_MAGIC_PORT) private readonly characterMagic: CharacterMagicPort,
    @Inject(SPELLCASTING_TABLES_PORT) private readonly tables: SpellcastingTablesPort,
  ) {}

  /**
   * The spell of a new `cast_spell` action (decisions 1 and 3): a spell of the caster's spellbook (lists and ranks of
   * strategic), instantaneous when the action is, and with the power points it needs left once the other open casts of
   * the round take theirs.
   */
  async declare(actorRound: ActorRound, actions: Action[], listCode: string, spellId: string, freeAction: boolean): Promise<ActionSpell> {
    if (actorRound.actorType !== 'character') {
      throw new ValidationError('Only a character actor casts spells from a spellbook', 'err-actor-without-spellbook');
    }
    const spellcasting = await this.readSpellcasting(actorRound);
    const list = spellcasting.lists.find(each => each.code === listCode);
    const known = list?.spells.find(each => each.spell.id === spellId);
    if (!list || !known) {
      throw new ValidationError(`The caster does not know spell ${spellId} of list ${listCode}`, 'err-spell-not-known');
    }
    if (freeAction && !known.spell.modifiers?.instant) {
      throw new ValidationError(`${known.spell.name} is not an instantaneous spell`, 'err-spell-not-instant');
    }
    const committed = actions
      .filter(action => action.actionType === 'cast_spell' && !action.isClosed() && action.spell?.powerPointsSpent == null)
      .reduce((sum, action) => sum + (action.spell?.spell.powerPoints ?? 0), 0);
    const available = (spellcasting.power?.current ?? 0) - committed;
    if (known.powerPoints > available) {
      throw new ValidationError(
        `${known.spell.name} takes ${known.powerPoints} power points and the caster has ${Math.max(0, available)} left`,
        'err-insufficient-power',
      );
    }
    return SpellCastingService.toActionSpell(spellcasting, list, known);
  }

  /** The action, its game and phase and its caster's round; the action has to be a cast. */
  async load(actionId: string): Promise<SpellActionContext> {
    const action = await this.actionRepository.findById(actionId);
    if (!action) throw new NotFoundError('Action', actionId);
    if (action.actionType !== 'cast_spell' || !action.spell) {
      throw new ValidationError('Action is not a spell cast', 'err-action-not-spell');
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    return { action, spell: action.spell, game, currentPhase: game.getActionPhase(), actorRound };
  }

  /** Modifiers of the Spellcasting Roll with the AP the action has now (decisions 6 and 7). */
  async calculate(context: SpellActionContext, requested: Partial<ActionSpellOptions> | undefined): Promise<ScrCalculation> {
    const options: ActionSpellOptions = { ...DEFAULT_SPELL_OPTIONS, ...(context.spell.options ?? {}), ...(requested ?? {}) };
    const { action, actorRound, currentPhase } = context;
    const actionPoints = action.apOf(actorRound, currentPhase);
    const apPenalty = action.takesApPenalty() ? action.apProfile().penaltyFor(actionPoints) : 0;
    const modifiers = scrModifiers(
      { spell: context.spell.spell, caster: context.spell.caster, options, apPenalty, penalties: actorRound.getPenaltiesBySource() },
      await this.tables.findModifiers(),
    );
    return { options, modifiers, bonus: modifiers.reduce((sum, modifier) => sum + modifier.value, 0) };
  }

  /** An overcast spell that is not instantaneous needs a preparation round (Spell Law 4.2). */
  checkPreparation(spell: ActionSpell, options: ActionSpellOptions): void {
    if (needsPreparation(spell.spell, spell.caster) && options.preparationRounds < 1) {
      throw new ValidationError(
        `${spell.spell.name} is above the caster's level: it needs a round of preparation`,
        'err-overcast-needs-preparation',
      );
    }
  }

  async readSpellcasting(actorRound: ActorRound): Promise<CharacterSpellcasting> {
    const spellcasting = await this.characterMagic.findSpellcasting(actorRound.characterId ?? actorRound.actorId);
    if (!spellcasting) {
      throw new ValidationError('The actor has no character sheet with spells', 'err-actor-without-spellbook');
    }
    return spellcasting;
  }

  spendPower(actorRound: ActorRound, amount: number): Promise<void> {
    return this.characterMagic.spendPower(actorRound.characterId ?? actorRound.actorId, amount);
  }

  static toActionSpell(spellcasting: CharacterSpellcasting, list: CharacterKnownSpellList, known: CharacterKnownSpell): ActionSpell {
    const modifiers = known.spell.modifiers ?? {};
    const realms = (values: string[]): SpellRealm[] => SPELL_REALMS.filter(realm => values.includes(realm));
    return {
      spell: {
        spellId: known.spell.id,
        name: known.spell.name,
        level: known.spell.level,
        typeCode: modifiers.typeCode ?? null,
        type: castingSpellType(modifiers.type),
        subtype: modifiers.subtype ?? null,
        instant: !!modifiers.instant,
        powerPoints: known.powerPoints,
        listCode: list.code,
        listName: list.name,
        listRealms: realms(list.realms).length > 0 ? realms(list.realms) : realms(spellcasting.realms),
        resistance: modifiers.resistance ?? null,
        range: modifiers.range ?? null,
        area: modifiers.area ?? null,
        duration: modifiers.duration ?? null,
        effects: known.spell.effects ?? [],
      },
      caster: {
        realms: realms(spellcasting.realms),
        realmStatBonus: spellcasting.realmStatBonus,
        level: spellcasting.level,
        listSkillId: list.skillId,
        ranks: list.ranks,
        listTypeModifier: list.listTypeModifier,
      },
    };
  }
}
