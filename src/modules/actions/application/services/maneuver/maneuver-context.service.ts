import { frenzyManeuverModifiers } from '../../../domain/services/frenzy-maneuver.js';
import type { FrenzyPurpose } from '../../../domain/value-objects/frenzy-purpose.vo.js';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type Character, type CharacterPort, CHARACTER_PORT } from '../../../../strategic/application/ports/character.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { DIFFICULTY_MAP, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { LIGHT_MAP, type LightType } from '../../../domain/value-objects/light-type.vo.js';
import type { LightManeuverModifier } from '../../../domain/value-objects/light-maneuver-modifier.vo.js';
import {
  DEFAULT_MANEUVER_PROFILE,
  type ManeuverModifierDefinition,
  type ManeuverModifierSelection,
  type SkillManeuverProfile,
} from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import type { PassiveSide } from '../../cqrs/commands/resolve-maneuver.command.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type SkillCatalogPort, SKILL_CATALOG_PORT } from '../../ports/skill-catalog.port.js';
import { SkippedRule } from '../../../domain/value-objects/skipped-rule.vo.js';
import {
  MANEUVER_PHASE,
  MANEUVER_RULES,
  type ManeuverBaseModifier,
  ManeuverBaseModifiersService,
  type ManeuverSkillBonus,
} from './maneuver-base-modifiers.service.js';
import { ERR_INVALID_MODIFIER, resolveSelections } from './maneuver-selections.js';

export const DEFAULT_DIFFICULTY: Difficulty = 'm';

/** Skill that resists an Influence maneuver (§14.2). */
export const SOCIAL_AWARENESS_SKILL_ID = 'social-awareness';

/** Everything a maneuver of an action needs, read once per request. */
export interface ManeuverContext {
  actorRound: ActorRound;
  character: Character;
  profile: SkillManeuverProfile;
  catalog: ManeuverModifierDefinition[];
  skill: ManeuverSkillBonus;
  base: ManeuverBaseModifier[];
  /** Rules of the base modifiers that do not apply, and why (workspace spec 052). */
  skipped: SkippedRule[];
  maneuverType: ManeuverType;
}

export interface ManeuverOption {
  key: string;
  value: number;
}

/** Modifiers a maneuver can take (spec 010 §3). */
export interface ManeuverModifiersListing {
  skill: ManeuverSkillBonus;
  maneuverType: ManeuverType;
  resultTable: string;
  base: ManeuverBaseModifier[];
  difficulty: { default: Difficulty; options: ManeuverOption[] };
  light?: { usage: Exclude<LightManeuverModifier, 'none'>; options: ManeuverOption[] };
  skillModifiers: ManeuverModifierDefinition[];
  conflicting: boolean;
  /** Percent maneuvers: progress accumulated before this roll. */
  progress?: number;
  /** Rules of the base modifiers that do not apply, and why (workspace spec 052). */
  skipped: SkippedRule[];
}

/** The choices of a maneuver roll. */
export interface ManeuverChoices {
  difficulty?: Difficulty;
  light?: LightType;
  /** How the skill uses light when its profile does not say (legacy requests). */
  lightUsage?: LightManeuverModifier;
  selections?: Record<string, ManeuverModifierSelection>;
  customBonus?: number;
  passiveTotal?: number;
  /** Workspace spec 040: the frenzy maneuver adds its own modifiers. */
  purpose?: FrenzyPurpose;
}

export interface ManeuverRollCalculation {
  modifiers: KeyValueModifier[];
  skipped: SkippedRule[];
  total: number;
  lightUsage: LightManeuverModifier;
}

export interface ManeuverContextOptions {
  skillId?: string;
  specialization?: string | null;
  maneuverType?: ManeuverType;
  /** AP of the action; when undefined, the AP it would take if it ended in the current phase. */
  actionPoints?: number | null;
}

/** Loads a maneuver's actor, sheet, skill profile and catalog, and builds its modifiers listing and roll total. */
@Injectable()
export class ManeuverContextService {
  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(SKILL_CATALOG_PORT) private readonly skillCatalog: SkillCatalogPort,
    private readonly baseModifiersService: ManeuverBaseModifiersService,
  ) {}

  async load(action: Action, game: Game, options: ManeuverContextOptions = {}): Promise<ManeuverContext> {
    if (!action.maneuver) {
      throw new ValidationError('Action is not a maneuver action');
    }
    const skillId = options.skillId || action.maneuver.modifiers.skillId;
    const specialization = options.skillId
      ? (options.specialization ?? null)
      : (options.specialization ?? action.maneuver.modifiers.specialization ?? null);
    const rsql = `gameId==${action.gameId};actorId==${action.actorId};round==${action.round}`;
    const [actorRound, character, skill, catalog, roundActions] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round),
      this.characterClient.findById(action.actorId),
      this.skillCatalog.findSkill(skillId),
      this.skillCatalog.findManeuverModifiers(skillId),
      this.actionRepository.findByRsql(rsql, 0, 100),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    if (!character) throw new NotFoundError('Character', action.actorId);
    if (!skill) throw new NotFoundError('Skill', skillId);
    const profile = skill.maneuver ?? DEFAULT_MANEUVER_PROFILE;
    const actionPoints =
      options.actionPoints !== undefined ? options.actionPoints : ManeuverContextService.expectedActionPoints(action, game, actorRound);
    const {
      skill: skillBonus,
      base,
      skipped,
    } = this.baseModifiersService.compute({
      actorRound,
      character,
      profile,
      skillId,
      specialization,
      actionPoints,
      freeAction: action.freeAction,
      pace: ManeuverBaseModifiersService.roundPace(roundActions.content, action.actorId, action.round),
      includePace: true,
    });
    const maneuverType = options.maneuverType || action.maneuver.modifiers.maneuverType || profile.defaultType;
    return { actorRound, character, profile, catalog, skill: skillBonus, base, skipped, maneuverType };
  }

  /**
   * AP the action has now, from the ledger of its actor round (spec 011, §2): what it takes if it is resolved in the
   * current phase. Outside the action phases, the stored AP (null when it has none).
   */
  static expectedActionPoints(action: Action, game: Game, actorRound: ActorRound): number | null {
    const phase = Game.toActionPhase(game.phase);
    if (phase === undefined) {
      return action.actionPoints ?? null;
    }
    return action.apOf(actorRound, phase);
  }

  listing(context: ManeuverContext, action: Action): ManeuverModifiersListing {
    const usage = context.profile.light;
    const listing: ManeuverModifiersListing = {
      skill: context.skill,
      maneuverType: context.maneuverType,
      resultTable: context.profile.resultTable,
      base: context.base,
      difficulty: {
        default: DEFAULT_DIFFICULTY,
        options: [...DIFFICULTY_MAP.entries()].map(([key, value]) => ({ key, value })),
      },
      skillModifiers: context.catalog,
      conflicting: ManeuverContextService.isConflicting(context.maneuverType, context.profile),
      skipped: context.skipped,
    };
    if (usage !== 'none') {
      listing.light = {
        usage,
        options: [...LIGHT_MAP.entries()].map(([key, value]) => ({ key, value: ManeuverContextService.lightValue(value, usage) })),
      };
    }
    if (context.maneuverType === 'percent') {
      listing.progress = action.maneuver?.progress ?? 0;
    }
    return listing;
  }

  /**
   * Conflicting maneuvers (chapter 3) are absolute ones against another actor's roll: every absolute maneuver offers
   * the passive total, which is optional. A `price` maneuver (Trading) is an opposed percent one (workspace spec 022,
   * decision 11).
   */
  static isConflicting(maneuverType: ManeuverType, profile?: SkillManeuverProfile): boolean {
    return maneuverType === 'absolute' || (maneuverType === 'percent' && profile?.resultKind === 'price');
  }

  /**
   * Passive total of a conflicting maneuver against an actor of the game (workspace spec 022, decision 12, D5p): its
   * roll, the bonus of its skill (from its character sheet, or the one sent for an NPC) and its penalties. The skill is
   * Social Awareness by default and, for a `price` maneuver, the seller's own Trading.
   */
  async passiveTotal(context: ManeuverContext, action: Action, passive: PassiveSide): Promise<{ total: number; skillId: string }> {
    if (passive.targetActorId === action.actorId) {
      throw new ValidationError('An actor cannot be the target of its own maneuver', ERR_INVALID_MODIFIER);
    }
    if (passive.roll === undefined || passive.roll === null || !Number.isFinite(passive.roll)) {
      throw new ValidationError('The roll of the target actor is required', 'err-maneuver-passive-roll-required');
    }
    const target = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, passive.targetActorId, action.round);
    if (!target) throw new NotFoundError('Target actor', passive.targetActorId, 'err-maneuver-target-not-found');
    const skillId = passive.skillId || (context.profile.resultKind === 'price' ? context.skill.skillId : SOCIAL_AWARENESS_SKILL_ID);
    let bonus = passive.bonus;
    if (bonus === undefined && target.actorType === 'character') {
      const sheet = await this.characterClient.findById(target.characterId ?? target.actorId);
      bonus = sheet ? ManeuverBaseModifiersService.skillBonus(sheet, skillId, null).bonus : undefined;
    }
    if (bonus === undefined) {
      throw new ValidationError(`Send the ${skillId} bonus of ${target.actorName}`, 'err-maneuver-passive-bonus-required');
    }
    return { total: passive.roll + bonus + Math.min(0, target.getPenaltySum()), skillId };
  }

  /**
   * Total of the roll (spec 010 §4.2): roll, skill, difficulty, base modifiers, light, catalog selections, custom
   * bonus and, in a conflicting maneuver, 100 less the passive total.
   */
  calculate(context: ManeuverContext, choices: ManeuverChoices, roll: number): ManeuverRollCalculation {
    const difficulty = choices.difficulty || DEFAULT_DIFFICULTY;
    const difficultyValue = DIFFICULTY_MAP.get(difficulty);
    if (difficultyValue === undefined) {
      throw new ValidationError(`Unknown difficulty '${difficulty}'`, ERR_INVALID_MODIFIER);
    }
    const skipped = [...context.skipped];
    const modifiers: KeyValueModifier[] = [
      new KeyValueModifier('roll', roll),
      ManeuverBaseModifiersService.skillModifier(context.skill),
      new KeyValueModifier('difficulty', difficultyValue, 'situation', 'difficulty', MANEUVER_RULES.difficulty, { difficulty }),
      ...context.base.map(
        modifier => new KeyValueModifier(modifier.key, modifier.value, modifier.group, modifier.source, modifier.rule, modifier.params),
      ),
    ];
    const lightUsage = context.profile.light !== 'none' ? context.profile.light : (choices.lightUsage ?? 'none');
    if (lightUsage !== 'none' && choices.light) {
      const lightValue = LIGHT_MAP.get(choices.light);
      if (lightValue === undefined) {
        throw new ValidationError(`Unknown light '${choices.light}'`, ERR_INVALID_MODIFIER);
      }
      modifiers.push(
        new KeyValueModifier(
          'light',
          ManeuverContextService.lightValue(lightValue, lightUsage),
          'situation',
          'light',
          MANEUVER_RULES.light,
          {
            light: choices.light,
            usage: lightUsage,
            base: lightValue,
          },
        ),
      );
    } else if (choices.light) {
      skipped.push(
        new SkippedRule('light', 'situation', 'light-not-needed', MANEUVER_PHASE, MANEUVER_RULES.light, { light: choices.light }),
      );
    }
    modifiers.push(...resolveSelections(context.catalog, choices.selections));
    if (choices.purpose) {
      modifiers.push(...frenzyManeuverModifiers(context.actorRound, choices.purpose));
    }
    if (choices.customBonus) {
      modifiers.push(new KeyValueModifier('custom-bonus', choices.customBonus, 'situation', 'custom'));
    }
    if (choices.passiveTotal !== undefined && choices.passiveTotal !== null) {
      if (!ManeuverContextService.isConflicting(context.maneuverType, context.profile)) {
        throw new ValidationError('Only an absolute or a price maneuver can be in conflict', ERR_INVALID_MODIFIER);
      }
      modifiers.push(
        new KeyValueModifier('conflict', 100 - choices.passiveTotal, 'situation', 'conflict', MANEUVER_RULES.conflict, {
          passive: choices.passiveTotal,
        }),
      );
    }
    const filtered = modifiers.filter((modifier, index) => index < 3 || modifier.value !== 0);
    const total = filtered.reduce((sum, modifier) => sum + modifier.value, 0);
    return { modifiers: filtered, skipped, total, lightUsage };
  }

  private static lightValue(value: number, usage: LightManeuverModifier): number {
    if (usage === 'required') return value * 2;
    if (usage === 'hiding') return -value;
    return value;
  }
}
