import { ActorRoundAlert } from '../value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../value-objets/actor-round-attack.vo';
import { ActorRoundDefenseMode } from '../value-objets/actor-round-defense-mode.vo';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import { ActorRoundEffect } from '../value-objets/actor-round-effect.vo';
import { ActorRoundFatigue } from '../value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../value-objets/actor-round-initiative.vo';
import { ActorRoundMovement } from '../value-objets/actor-round-movement.vo';
import { ActorRoundPenalty } from '../value-objets/actor-round-penalty.vo';
import { ActorRoundPhaseLog } from '../value-objets/actor-round-phase-log.vo';
import { ActorRoundTrait } from '../value-objets/actor-round-trait.vo';
import { ActorRoundUsedBo } from '../value-objets/actor-round-used-bo.vo';
import { ActorType } from '../value-objets/actor-type.vo';
import { ApLedgerEntry } from '../value-objets/ap-ledger-entry.vo';
import { ApModifier } from '../value-objets/ap-modifier.vo';

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
  imageUrl: string | undefined;
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
}
