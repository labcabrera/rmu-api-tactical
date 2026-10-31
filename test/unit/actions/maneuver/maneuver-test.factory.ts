import { vi } from 'vitest';
import type { DomainEventPublisher } from '../../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { ActionRepository } from '../../../../src/modules/actions/application/ports/action-repository.port.js';
import type {
  AbsoluteManeuverResponse,
  ManeuverPort,
  PercentManeuverResponse,
} from '../../../../src/modules/actions/application/ports/maneuver.port.js';
import type { SkillCatalogPort } from '../../../../src/modules/actions/application/ports/skill-catalog.port.js';
import { ManeuverBaseModifiersService } from '../../../../src/modules/actions/application/services/maneuver/maneuver-base-modifiers.service.js';
import { ManeuverContextService } from '../../../../src/modules/actions/application/services/maneuver/maneuver-context.service.js';
import { Action, type ActionProps } from '../../../../src/modules/actions/domain/aggregates/action.js';
import type { ActionManeuver } from '../../../../src/modules/actions/domain/value-objects/action-maneuver.vo.js';
import type {
  ManeuverModifierDefinition,
  SkillManeuverProfile,
} from '../../../../src/modules/actions/domain/value-objects/maneuver-profile.vo.js';
import type { Pace } from '../../../../src/modules/actions/domain/value-objects/pace.vo.js';
import type { ActorRoundRepository } from '../../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import type { ActorRound } from '../../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import type { GameRepository } from '../../../../src/modules/games/application/ports/game-repository.port.js';
import type { Game } from '../../../../src/modules/games/domain/aggregates/game.js';
import type { Character, CharacterPort, CharacterSkill } from '../../../../src/modules/strategic/application/ports/character.port.js';
import { load } from '../../actor-rounds/actor-round-test.factory.js';
import type { PsychologyTablesPort } from '../../../../src/modules/psychology/application/ports/psychology-tables.port.js';
import { PSYCHOLOGY_TABLES } from '../../../fixtures/psychology-tables.js';
import { sheetsOf } from '../../support/actor-sheets.js';

/*
 * Invented catalog data: skills, profiles and modifiers here are made up for the tests and are not the book's.
 */

export const profile = (overrides: Partial<SkillManeuverProfile> = {}): SkillManeuverProfile => ({
  defaultType: 'absolute',
  resultTable: 'generic',
  movement: false,
  light: 'none',
  ...overrides,
});

export const PROFILES: Record<string, SkillManeuverProfile> = {
  'wall-scaling': profile({ movement: true, resultTable: 'gymnastic' }),
  'old-lore': profile({ resultTable: 'lore' }),
  'keen-eye': profile({ light: 'required', actionPoints: { min: 0, max: 2 } }),
  'shadow-hiding': profile({ light: 'hiding' }),
  'quick-fix': profile({ actionPoints: { min: 1, max: 4 } }),
  'creature-taming': profile({ resultTable: 'animal' }),
  'long-work': profile({ defaultType: 'percent', movement: true }),
  'desk-work': profile({ defaultType: 'percent' }),
  trading: profile({ defaultType: 'percent', resultKind: 'price' }),
  leadership: profile({ resultKind: 'morale' }),
  influence: profile({ resultTable: 'influence' }),
};

export const CATALOG: Record<string, ManeuverModifierDefinition[]> = {
  'creature-taming': [
    {
      id: 'm1',
      key: 'creature-temper',
      scope: { skillIds: ['creature-taming'] },
      type: 'choice',
      options: [
        { key: 'tame', value: 15 },
        { key: 'feral', value: -35 },
      ],
    },
    { id: 'm2', key: 'creature-wits', scope: { categoryIds: ['beasts'] }, type: 'choice', options: [{ key: 'dim', value: 5 }] },
    { id: 'm3', key: 'creature-herd', scope: { categoryIds: ['beasts'] }, type: 'flag', value: -15 },
    { id: 'm4', key: 'creature-kin', scope: { categoryIds: ['beasts'] }, type: 'flag', value: 12 },
    { id: 'm5', key: 'creature-habitat', scope: { categoryIds: ['beasts'] }, type: 'number', perUnit: -7, min: 0, max: 3 },
  ],
};

export interface ManeuverSetup {
  skillId?: string;
  maneuverType?: 'absolute' | 'percent';
  phaseStart?: number;
  freeAction?: boolean;
  phase?: string;
  skills?: CharacterSkill[];
  maneuverPenalty?: number;
  encumbrancePenalty?: number;
  penalties?: Array<[string, number]>;
  pace?: Pace;
  maneuver?: Partial<ActionManeuver>;
  absolute?: AbsoluteManeuverResponse;
  percent?: PercentManeuverResponse;
  otherActions?: Action[];
  fatigue?: number;
  /** Other actor rounds of the round (targets), with their character sheets. */
  targets?: { actorRound: ActorRound; character?: Character }[];
  /** Changes to the actor round of the maneuver (traits, effects, style...). */
  actorRound?: (actorRound: ActorRound) => void;
}

export const action = (props: Partial<ActionProps>): Action =>
  Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType: 'maneuver',
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'user-1',
    createdAt: new Date(),
    updatedAt: null,
    ...props,
  });

export const movementAction = (pace: Pace, id = 'move-1'): Action =>
  action({
    id,
    actionType: 'movement',
    status: 'completed',
    movement: {
      modifiers: { pace, requiredManeuver: false, skillId: null, difficulty: null, customBonus: null },
      roll: null,
      calculated: { bmr: 20, paceMultiplier: 1, percent: 100, distance: 20, distanceAdjusted: 20, critical: null, description: '' },
    },
  });

export const setupManeuver = (options: ManeuverSetup = {}) => {
  const skillId = options.skillId ?? 'old-lore';
  const maneuverAction = action({
    freeAction: options.freeAction ?? false,
    phaseStart: options.phaseStart ?? 1,
    maneuver: {
      modifiers: { skillId, maneuverType: options.maneuverType ?? PROFILES[skillId]?.defaultType ?? 'absolute', difficulty: 'm' },
      ...(options.maneuver ?? {}),
    },
  });
  const roundActions: Action[] = [maneuverAction, ...(options.pace ? [movementAction(options.pace)] : []), ...(options.otherActions ?? [])];
  const actorRound: ActorRound = load({ penalties: options.penalties ?? [] });
  if (options.fatigue) {
    actorRound.applyEnduranceResult(options.fatigue, 0);
  }
  options.actorRound?.(actorRound);
  const character = {
    id: 'actor-1',
    skills: options.skills ?? [{ skillId, specialization: null, totalBonus: 40, ranks: 5 }],
    equipment: {
      slots: {},
      maneuverPenalty: options.maneuverPenalty ?? 0,
      encumbrancePenalty: options.encumbrancePenalty ?? 0,
      movementBaseDifficulty: 'm',
    },
  } as unknown as Character;
  const game = { id: 'game-1', phase: options.phase ?? 'phase_1', round: 1, checkNotFinished: () => undefined } as unknown as Game;

  const actionUpdate = vi.fn((updated: Action) => Promise.resolve(updated));
  const actionRepository = {
    findById: vi.fn((id: string) => Promise.resolve(roundActions.find(a => a.id === id) ?? null)),
    findByRsql: vi.fn(() => Promise.resolve({ content: roundActions, page: 0, size: 100, totalElements: roundActions.length })),
    update: actionUpdate,
  } as unknown as ActionRepository;
  const actorRoundUpdate = vi.fn((updated: ActorRound) => Promise.resolve(updated));
  const actorRoundRepository = {
    findByActorIdAndRound: vi.fn((_gameId: string, actorId: string) =>
      Promise.resolve(
        actorId === 'actor-1' ? actorRound : (options.targets?.find(t => t.actorRound.actorId === actorId)?.actorRound ?? null),
      ),
    ),
    update: actorRoundUpdate,
  } as unknown as ActorRoundRepository;
  const gameRepository = { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository;
  const characterClient = {
    findById: vi.fn((id: string) =>
      Promise.resolve(id === 'actor-1' ? character : options.targets?.find(t => t.actorRound.actorId === id)?.character),
    ),
    findByGameId: vi.fn(() => Promise.resolve([character])),
  } as unknown as CharacterPort;
  const findSkill = vi.fn((id: string) =>
    Promise.resolve(
      PROFILES[id]
        ? { id, categoryId: 'beasts', maneuver: PROFILES[id] }
        : id === 'missing'
          ? null
          : { id, categoryId: 'x', maneuver: profile() },
    ),
  );
  const findManeuverModifiers = vi.fn((id: string) => Promise.resolve(CATALOG[id] ?? []));
  const skillCatalog: SkillCatalogPort = { findSkill, findManeuverModifiers };
  const absolute = vi.fn<(roll: number, table?: string, unusualEvent?: boolean) => Promise<AbsoluteManeuverResponse>>(() =>
    Promise.resolve(options.absolute ?? { result: 'success', message: 'Done', effects: [] }),
  );
  const percent = vi.fn<(roll: number) => Promise<PercentManeuverResponse>>(() =>
    Promise.resolve(options.percent ?? { percent: 50, critical: null, message: 'Completed at 50%' }),
  );
  const maneuverPort = { absolute, percent, endurance: vi.fn() } as unknown as ManeuverPort;
  const publish = vi.fn(() => Promise.resolve());
  const eventBus = { publish } as unknown as DomainEventPublisher;
  const contextService = new ManeuverContextService(
    actorRoundRepository,
    actionRepository,
    sheetsOf(characterClient),
    skillCatalog,
    new ManeuverBaseModifiersService(),
  );
  return {
    action: maneuverAction,
    actorRound,
    character,
    game,
    actionRepository,
    actorRoundRepository,
    gameRepository,
    skillCatalog,
    findSkill,
    findManeuverModifiers,
    maneuverPort,
    absolute,
    percent,
    eventBus,
    publish,
    contextService,
    psychologyTables: { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) } as PsychologyTablesPort,
    actionUpdate,
    actorRoundUpdate,
  };
};

/** Breakdown of a roll as a key → value map. */
export const breakdown = (modifiers: Array<{ key: string; value: number }> | undefined): Record<string, number> =>
  Object.fromEntries((modifiers ?? []).map(m => [m.key, m.value]));
