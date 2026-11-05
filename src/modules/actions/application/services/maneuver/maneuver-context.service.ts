import { frenzyManeuverModifiers } from '../../../domain/services/frenzy-maneuver.js';
import { type CombatTalentChoices, combatTalentModifiers } from '../../../domain/services/combat-talent-maneuver.js';
import { isFrenzyPurpose, type ManeuverPurpose } from '../../../domain/value-objects/maneuver-purpose.vo.js';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type ActorSheet, ActorSheetService } from '../../../../actor-rounds/application/services/actor-sheet.service.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { DIFFICULTY_MAP, type Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';
import {
  LIGHT_TABLE,
  LIGHT_TYPES,
  type LightType,
  lightModifierValue,
  lightSensitivityPenalty,
  type VisionAbilities,
} from '../../../domain/value-objects/light-type.vo.js';
import {
  ActorRoundTrait,
  DARKVISION,
  LIGHT_SENSITIVITY,
  NIGHTVISION,
} from '../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import {
  availableSenseSelections,
  availableSenses,
  DEFAULT_SENSE,
  DEFAULT_SENSE_USAGE,
  type Sense,
  type SenseChoices,
  type SenseModifierOption,
  type SenseSelection,
  SENSE_SKILL_IDS,
  SENSE_USAGES,
  type SenseUsage,
  senseModifierOptions,
  senseModifiers,
  validateSenseChoices,
} from '../../../../shared/domain/senses/sense-modifiers.js';
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
  /** The character sheet, or the stat block of an NPC (spec 055). */
  character: ActorSheet;
  profile: SkillManeuverProfile;
  catalog: ManeuverModifierDefinition[];
  skill: ManeuverSkillBonus;
  base: ManeuverBaseModifier[];
  /** Rules of the base modifiers that do not apply, and why (workspace spec 052). */
  skipped: SkippedRule[];
  maneuverType: ManeuverType;
  /** Skill category of the skill rolled (Absolute Ease, workspace spec 076); null when core does not say. */
  categoryId?: string | null;
  /** Talents of the actor: its actor round's, or those of its NPC stat block when the actor round has none. */
  traits?: ActorRoundTrait[];
  /** Ambient light of the tactical game (workspace spec 076, P6): the light of a roll that sends none. */
  defaultLight?: LightType | null;
}

/** Light of a maneuver: its value, and the Light Sensitivity penalty of the actor when it has the talent. */
export interface ManeuverLightOption extends ManeuverOption {
  sensitivity?: number;
}

/** Senses a Perception or Tracking maneuver can use, and the modifiers of the actor's talents (workspace spec 076). */
export interface ManeuverSensesListing {
  default: Sense;
  options: Sense[];
  defaultUsage: SenseUsage;
  usages: SenseUsage[];
  /** Selections that change something for the actor. */
  selections: SenseSelection[];
  /** Every modifier of the actor's sense talents, with the sense, usage and selection it needs. */
  modifiers: SenseModifierOption[];
}

/** Workspace spec 076, §3.2: light only counts for these skills when the sense is vision; their usage when core gives none. */
const SENSE_SKILL_LIGHT: Record<string, Exclude<LightManeuverModifier, 'none'>> = {
  perception: 'required',
  tracking: 'helpful',
};

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
  light?: { usage: Exclude<LightManeuverModifier, 'none'>; options: ManeuverLightOption[] };
  /** Ambient light of the tactical game, the default of the light selector; null when the game has none. */
  defaultLight: LightType | null;
  /** Perception and Tracking (workspace spec 076, block C): the senses the maneuver can use. */
  senses?: ManeuverSensesListing;
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
  /** Workspace spec 040: the frenzy maneuver adds its own modifiers; and those of the combat talents (spec 076). */
  purpose?: ManeuverPurpose;
  /** Workspace spec 076, §2.6: the choices of the maneuver of a combat talent. */
  combatTalent?: CombatTalentChoices;
  /** Workspace spec 076, §3.1: the sense of a Perception or Tracking maneuver. */
  senses?: SenseChoices;
}

export interface ManeuverRollCalculation {
  modifiers: KeyValueModifier[];
  skipped: SkippedRule[];
  total: number;
  lightUsage: LightManeuverModifier;
  /** Light the roll took: the one sent or the ambient light, when the maneuver uses it. */
  light?: LightType;
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
    private readonly sheets: ActorSheetService,
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
    const [actorRound, skill, catalog, roundActions] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round),
      this.skillCatalog.findSkill(skillId),
      this.skillCatalog.findManeuverModifiers(skillId),
      this.actionRepository.findByRsql(rsql, 0, 100),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    // Spec 055: an NPC takes its skills from its stat block.
    const character = await this.sheets.find(actorRound);
    if (!character) throw new NotFoundError(actorRound.actorType === 'npc' ? 'NPC' : 'Character', actorRound.npcId ?? action.actorId);
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
    return {
      actorRound,
      character,
      profile,
      catalog,
      skill: skillBonus,
      base,
      skipped,
      maneuverType,
      categoryId: skill.categoryId ?? null,
      traits: actorRound.traits?.length ? actorRound.traits : (character.npcTraits ?? []),
      defaultLight: game.environment?.light ?? null,
    };
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
    const usage = ManeuverContextService.lightUsageOf(context, DEFAULT_SENSE);
    const traits = context.traits ?? [];
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
      defaultLight: context.defaultLight ?? null,
    };
    if (usage !== 'none') {
      const nightvision = ActorRoundTrait.tierOf(traits, NIGHTVISION) > 0;
      const sensitivity = usage === 'hiding' ? 0 : ActorRoundTrait.tierOf(traits, LIGHT_SENSITIVITY);
      listing.light = {
        usage,
        options: LIGHT_TYPES.map(key => {
          const penalty = lightSensitivityPenalty(key, sensitivity);
          return { key, value: lightModifierValue(key, usage, { nightvision }), ...(penalty ? { sensitivity: penalty } : {}) };
        }),
      };
    }
    if (SENSE_SKILL_IDS.includes(context.skill.skillId)) {
      listing.senses = {
        default: DEFAULT_SENSE,
        options: availableSenses(traits),
        defaultUsage: DEFAULT_SENSE_USAGE,
        usages: [...SENSE_USAGES],
        selections: availableSenseSelections(traits, ActorRoundTrait.tierOf(traits, DARKVISION) > 0),
        modifiers: senseModifierOptions(traits),
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
   * roll, the bonus of its skill (from its character sheet or the NPC's stat block, else the one sent) and its penalties. The skill is
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
    if (bonus === undefined) {
      // Spec 055: an NPC's stat block gives the bonus when it lists the skill; otherwise it is sent.
      const sheet = await this.sheets.find(target);
      const listed = !!sheet && (!sheet.npc || sheet.skills.some(skill => skill.skillId === skillId));
      bonus = listed ? ManeuverBaseModifiersService.skillBonus(sheet, skillId, null).bonus : undefined;
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
    const traits = context.traits ?? [];
    const senses = choices.senses ?? {};
    validateSenseChoices(context.skill.skillId, traits, choices.senses);
    const sense = senses.sense ?? DEFAULT_SENSE;
    const lightUsage = ManeuverContextService.lightUsageOf(context, sense, choices.lightUsage);
    const light = choices.light ?? context.defaultLight ?? undefined;
    if (light !== undefined && !LIGHT_TABLE[light]) {
      throw new ValidationError(`Unknown light '${light}'`, ERR_INVALID_MODIFIER);
    }
    let appliedLight: LightType | undefined;
    if (lightUsage !== 'none' && light) {
      appliedLight = light;
      modifiers.push(...ManeuverContextService.lightModifiers(light, lightUsage, traits, senses.senseSelections));
    } else if (choices.light) {
      skipped.push(
        new SkippedRule('light', 'situation', 'light-not-needed', MANEUVER_PHASE, MANEUVER_RULES.light, { light: choices.light }),
      );
    }
    if (SENSE_SKILL_IDS.includes(context.skill.skillId)) {
      modifiers.push(
        ...senseModifiers(traits, senses).map(
          modifier =>
            new KeyValueModifier(modifier.key, modifier.value, 'senses', 'senses', modifier.rule, {
              ...modifier.params,
              ...(modifier.params.sense ? {} : { sense }),
            }),
        ),
      );
    }
    modifiers.push(...resolveSelections(context.catalog, choices.selections));
    if (isFrenzyPurpose(choices.purpose)) {
      modifiers.push(...frenzyManeuverModifiers(context.actorRound, choices.purpose));
    } else if (choices.purpose) {
      modifiers.push(...combatTalentModifiers(choices.purpose, choices.combatTalent ?? {}));
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
    return { modifiers: filtered, skipped, total, lightUsage, ...(appliedLight ? { light: appliedLight } : {}) };
  }

  /**
   * How the maneuver uses light: its profile's, or the legacy usage of the request when the profile has none. Perception
   * and Tracking (workspace spec 076, §3.2) use it only with vision: required for Perception and helpful for Tracking
   * when core's profile does not say.
   */
  static lightUsageOf(context: ManeuverContext, sense: Sense, legacyUsage?: LightManeuverModifier): LightManeuverModifier {
    const skillLight = SENSE_SKILL_LIGHT[context.skill.skillId];
    if (skillLight) {
      if (sense !== 'vision') return 'none';
      return context.profile.light !== 'none' ? context.profile.light : skillLight;
    }
    return context.profile.light !== 'none' ? context.profile.light : (legacyUsage ?? 'none');
  }

  /**
   * Light modifiers of a maneuver (Table 15-7): the light, with the Nightvision column or none within the range of
   * Darkvision, and the Light Sensitivity penalty (§4.5). Hiding reads only the darkness around the one who hides.
   */
  static lightModifiers(
    light: LightType,
    usage: LightManeuverModifier,
    traits: ActorRoundTrait[],
    selections: SenseSelection[] = [],
  ): KeyValueModifier[] {
    const vision: VisionAbilities = usage === 'hiding' ? {} : ManeuverContextService.visionOf(traits, selections);
    const params: Record<string, string | number | boolean> = { light, usage, base: LIGHT_TABLE[light].penalty / 2 };
    if (vision.withinDarkvision) params.darkvision = true;
    else if (vision.nightvision) params.nightvision = true;
    const modifiers = [
      new KeyValueModifier('light', lightModifierValue(light, usage, vision), 'situation', 'light', MANEUVER_RULES.light, params),
    ];
    const tier = usage === 'hiding' ? 0 : ActorRoundTrait.tierOf(traits, LIGHT_SENSITIVITY);
    const sensitivity = lightSensitivityPenalty(light, tier);
    if (sensitivity) {
      modifiers.push(
        new KeyValueModifier(LIGHT_SENSITIVITY, sensitivity, 'senses', 'senses', MANEUVER_RULES.lightSensitivity, { light, tier }),
      );
    }
    return modifiers;
  }

  private static visionOf(traits: ActorRoundTrait[], selections: SenseSelection[]): { nightvision: boolean; withinDarkvision: boolean } {
    return {
      nightvision: ActorRoundTrait.tierOf(traits, NIGHTVISION) > 0,
      withinDarkvision: ActorRoundTrait.tierOf(traits, DARKVISION) > 0 && selections.includes('within-darkvision'),
    };
  }
}
