import { ActorRoundAlert } from '../value-objects/actor-round-alert.vo.js';
import { ActorRoundAttack } from '../value-objects/actor-round-attack.vo.js';
import { ActorRoundDefenseMode } from '../value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundDefense } from '../value-objects/actor-round-defense.vo.js';
import { ActorRoundEffect } from '../value-objects/actor-round-effect.vo.js';
import { ActorRoundFatigue } from '../value-objects/actor-round-fatigue.vo.js';
import { ActorRoundHP } from '../value-objects/actor-round-hp.vo.js';
import { ActorRoundInitiative } from '../value-objects/actor-round-initiative.vo.js';
import { ActorRoundMovement } from '../value-objects/actor-round-movement.vo.js';
import { ActorRoundPenalty } from '../value-objects/actor-round-penalty.vo.js';
import { ActorRoundPhaseLog } from '../value-objects/actor-round-phase-log.vo.js';
import { ActorRoundTrait } from '../value-objects/actor-round-trait.vo.js';
import { ActorRoundUsedBo } from '../value-objects/actor-round-used-bo.vo.js';
import type { ActorType } from '../value-objects/actor-type.vo.js';
import { ApLedgerEntry } from '../value-objects/ap-ledger-entry.vo.js';
import { ApModifier } from '../value-objects/ap-modifier.vo.js';
import type { HpLogEntry } from '../value-objects/hp-log-entry.vo.js';
import type { Injury } from '../value-objects/injury.vo.js';
import type { ActorRoundItem } from '../value-objects/actor-round-item.vo.js';
import type { ActorRoundActiveStyle, ActorRoundFightingStyle } from '../value-objects/actor-round-fighting-style.vo.js';
import type { ActorRoundResistance } from '../value-objects/actor-round-resistance.vo.js';

/** What the actor brought into the game, taken when round 1 is built from its character (spec 013, §3). */
export interface ActorRoundSnapshot {
  hp: number;
  injuryIds: string[];
  conditionIds: string[];
}

export interface ActorRoundProps {
  id: string;
  gameId: string;
  round: number;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  size: number;
  movement: ActorRoundMovement;
  raceName: string;
  level: number;
  factionId: string;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  fatigue: ActorRoundFatigue;
  penalty: ActorRoundPenalty;
  defense: ActorRoundDefense;
  /** Missing in actor rounds stored before it existed: no dodge or block declared. */
  defenseMode?: ActorRoundDefenseMode;
  attacks: ActorRoundAttack[];
  usedBo: ActorRoundUsedBo[];
  parries: number[];
  effects: ActorRoundEffect[];
  alerts: ActorRoundAlert[];
  /** Missing in actor rounds stored before it existed: none. */
  traits?: ActorRoundTrait[];
  /** Missing in actor rounds stored before it existed: empty. */
  phaseLog?: ActorRoundPhaseLog[];
  /** Derived from the effects: recomputed when read. */
  apModifiers?: ApModifier[];
  /** Derived from the modifiers and the ledger: recomputed when read. */
  apCapacity?: number[];
  /** Missing or empty in actor rounds stored before it existed: rebuilt from the phase log. */
  apLedger?: ApLedgerEntry[];
  /** Missing in actor rounds stored before spec 013: none (legacy bleeding effects and critical penalties are read as injuries). */
  injuries?: Injury[];
  /** Changes of the hits in this round (spec 013, §1.1). Missing in actor rounds stored before it existed: empty. */
  hpLog?: HpLogEntry[];
  /** Strategic character of a character actor. */
  characterId?: string;
  /** Items of the actor (spec 019). Missing in actor rounds stored before it: none. */
  items?: ActorRoundItem[];
  /** Resistance roll bonuses of its character (workspace spec 022). Missing for NPCs and older actor rounds: none. */
  resistances?: ActorRoundResistance[];
  /** Fighting styles of its character (workspace spec 032). Missing for NPCs and older actor rounds: none. */
  fightingStyles?: ActorRoundFightingStyle[];
  /** The fighting style it fights with (workspace spec 032); null or missing: none. */
  activeStyle?: ActorRoundActiveStyle | null;
  /** Only in the actor round built from the character (round 1, or the round it joined in). */
  snapshot?: ActorRoundSnapshot;
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
}
