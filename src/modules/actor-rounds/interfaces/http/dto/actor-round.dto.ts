import type { ActorRoundBoReservation } from '../../../domain/value-objects/actor-round-bo-reservation.vo.js';
import { LostLimbDto } from './lost-limb.dto.js';
import { ActorRoundBreathDto } from './actor-round-breath.dto.js';
import { ItemConsumedDto, TemporaryModifierDto } from './temporary-modifier.dto.js';
import { ActorRoundItemDto } from './actor-round-item.dto.js';
import { BreakageCheckResultDto } from './resolve-breakage-check.dto.js';
import { ActorRoundActiveStyleDto, ActorRoundFightingStyleDto } from './actor-round-fighting-style.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../../shared/interfaces/http/dto/page.dto.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../domain/value-objects/actor-round-effect.vo.js';
import { rollProfileOf } from '../../../domain/value-objects/actor-roll-profile.vo.js';
import { ActorRoundAlertDto } from './actor-round-alert.dto.js';
import { ConcentrationFocusDto } from './concentration-focus.dto.js';
import { ActorRoundApLedgerEntryDto } from './actor-round-ap-ledger-entry.dto.js';
import { ActorRoundApModifierDto } from './actor-round-ap-modifier.dto.js';
import { ActorRoundAttackDto } from './actor-round-attack.dto.js';
import { ActorRoundDefenseModeDto } from './actor-round-defense-mode.dto.js';
import { ActorRoundDefenseDto } from './actor-round-defense.dto.js';
import { ActorRoundFatigueDto } from './actor-round-fatigue.dto.js';
import { ActorRoundHPDto } from './actor-round-hp.dto.js';
import { ActorRoundSnapshotDto, InjuryDto } from './actor-round-injury.dto.js';
import { PoisonExposureDto } from './poison.dto.js';
import { ActorRoundInitiativeDto } from './actor-round-initiative.dto.js';
import { ActorRoundMovementDto } from './actor-round-movement.dto.js';
import { HpLogEntryDto } from './hp-log-entry.dto.js';
import { ActorRoundParryDto } from './actor-round-parry.dto.js';
import { ActorRoundPenaltyDto } from './actor-round-penalty.dto.js';
import { ActorRoundPhaseLogDto } from './actor-round-phase-log.dto.js';
import { ActorRoundTraitDto } from './actor-round-trait.dto.js';
import { ActorRoundHazardDto } from './actor-round-hazard.dto.js';
import { CriticalAlertRollDto } from './resolve-critical-alert.dto.js';

export class AbsoluteEaseDto {
  @ApiProperty({ description: 'Skill category of the Absolute Ease talent', example: 'athletic' })
  categoryId: string;

  @ApiProperty({ description: 'Tier: absolute success from 151 (1), 126 (2) or always (3)', example: 1 })
  tier: number;

  @ApiProperty({ description: 'Absolute Disaster: failures up to 25 (1), 50 (2) or always (3) are absolute' })
  disaster: boolean;
}

/** Workspace spec 076, §2.8: how the actor's talents change its rolls, computed from its traits. */
export class ActorRollProfileDto {
  @ApiProperty({ description: 'An open-ended roll opens high from this die (96 less Lucky and Dramatic Luck)', example: 96 })
  highFrom: number;

  @ApiProperty({ description: 'An open-ended roll opens low up to this die (5 plus Dramatic Luck)', example: 5 })
  lowTo: number;

  @ApiProperty({ description: 'Unusual Luck: a natural 66 of an unopposed absolute maneuver is a success' })
  unusualLuck: boolean;

  @ApiProperty({ description: 'Terrible Luck: a natural 01 raises a terrible-luck alert' })
  terribleLuck: boolean;

  @ApiProperty({ description: 'Spasm: a natural 66 gives a spasm of d10 rounds' })
  spasm: boolean;

  @ApiProperty({ description: 'Absolute Ease by skill category', type: [AbsoluteEaseDto] })
  absoluteEase: AbsoluteEaseDto[];
}

export class ActorRoundResistanceDto {
  @ApiProperty({ description: 'Resistance type', example: 'fear' })
  resistance: string;

  @ApiProperty({ description: 'Total resistance roll bonus', example: 12 })
  totalBonus: number;
}

export class ActorRoundDto {
  @ApiProperty({ description: 'Actor Round identifier', example: 'actor-round-123' })
  id: string;

  @ApiProperty({ type: Number, description: 'Version of optimistic concurrency: it goes up with each write', example: 0 })
  version: number;

  @ApiProperty({ description: 'Game identifier', example: 'game-001' })
  gameId: string;

  @ApiProperty({ description: 'Actor identifier', example: 'actor-001' })
  actorId: string;

  @ApiProperty({ description: 'Actor type', example: 'character' })
  actorType: string;

  @ApiProperty({ description: 'Actor name', example: 'Goblin Warrior' })
  actorName: string;

  @ApiProperty({ description: 'Actor size, in steps from medium (size class − 5, spec 075)', example: 0 })
  size: number;

  @ApiProperty({ description: 'Race identifier', example: 'race-goblin', required: false })
  raceName?: string;

  @ApiProperty({ description: 'Actor level', example: 1, required: false })
  level?: number;

  @ApiProperty({ description: 'Faction', required: true })
  factionId: string;

  @ApiProperty({ description: 'Round number', example: 1 })
  round: number;

  @ApiProperty({ description: 'Initiative information' })
  movement: ActorRoundMovementDto;

  @ApiProperty({ description: 'Initiative information' })
  initiative: ActorRoundInitiativeDto;

  @ApiProperty({ description: 'Base action points of the round, before modifiers', example: 4 })
  actionPoints: number;

  @ApiProperty({ description: 'Modifiers of the action points, with their origin', type: [ActorRoundApModifierDto] })
  apModifiers: ActorRoundApModifierDto[];

  @ApiProperty({ description: 'Action points of each action phase (index 0 is phase 1)', type: [Number], example: [1, 1, 2, 2] })
  apCapacity: number[];

  @ApiProperty({ description: 'Action points spent, lost or used by phase and action', type: [ActorRoundApLedgerEntryDto] })
  apLedger: ActorRoundApLedgerEntryDto[];

  @ApiProperty({
    description: 'What the actor concentrates on (spec 077): with any, each AP of another action counts half',
    type: [ConcentrationFocusDto],
  })
  concentration: ConcentrationFocusDto[];

  @ApiProperty({ description: 'Hit points' })
  hp: ActorRoundHPDto;

  @ApiProperty({ description: 'Fatigue points' })
  fatigue: ActorRoundFatigueDto;

  @ApiProperty({ description: 'Defense information' })
  defense: ActorRoundDefenseDto;

  @ApiProperty({ description: 'Dodge and shield block declared this round', type: ActorRoundDefenseModeDto })
  defenseMode: ActorRoundDefenseModeDto;

  @ApiProperty({ description: 'Action points spent in each action phase that has ended', type: [ActorRoundPhaseLogDto] })
  phaseLog: ActorRoundPhaseLogDto[];

  @ApiProperty({ description: 'Attacks', type: [ActorRoundAttackDto] })
  attacks: ActorRoundAttackDto[];

  @ApiProperty({ description: 'Parries', type: [ActorRoundParryDto] })
  parries: number[];

  @ApiProperty({ description: 'OB committed by actions not applied yet (spec 083)', type: 'array', items: { type: 'object' } })
  boReservations: ActorRoundBoReservation[];

  @ApiProperty({ description: 'Penalties' })
  penalty: ActorRoundPenaltyDto;

  @ApiProperty({ description: 'Active effects', type: [ActorRoundEffect] })
  effects: ActorRoundEffect[];

  @ApiProperty({ description: 'Alerts', type: [ActorRoundAlertDto] })
  alerts: ActorRoundAlertDto[];

  @ApiProperty({ description: 'Talents and flaws of the actor, from its character sheet', type: [ActorRoundTraitDto] })
  traits: ActorRoundTraitDto[];

  @ApiProperty({ description: 'How the talents change the rolls of the actor (spec 076)', type: ActorRollProfileDto })
  rollProfile: ActorRollProfileDto;

  @ApiProperty({ description: 'Injuries of the actor (spec 013): brought from its character and taken in the game', type: [InjuryDto] })
  injuries: InjuryDto[];

  @ApiProperty({ description: 'Poisons waiting for their RR (workspace spec 042)', type: [PoisonExposureDto] })
  poisonExposures: PoisonExposureDto[];

  @ApiProperty({ description: 'Changes of the hits in this round, with their origin (spec 013)', type: [HpLogEntryDto] })
  hpLog: HpLogEntryDto[];

  @ApiProperty({ description: 'Strategic character of a character actor', required: false })
  characterId?: string;

  @ApiProperty({ description: 'NPC an NPC actor is a specimen of (spec 055)', required: false })
  npcId?: string;

  @ApiProperty({ description: 'Items of the actor, with their breakage (spec 019)', type: [ActorRoundItemDto] })
  items: ActorRoundItemDto[];

  @ApiProperty({ description: 'Result of the breakage check of this request (only in its answer)', required: false })
  lastBreakageCheck?: BreakageCheckResultDto;

  @ApiProperty({
    type: CriticalAlertRollDto,
    required: false,
    description: 'Only in the answer of a critical-roll (spec 077): the critical rolled and applied',
  })
  lastCriticalRoll?: CriticalAlertRollDto;

  @ApiProperty({
    description: 'Resistance roll bonuses of the character (workspace spec 022); none for NPCs',
    type: [ActorRoundResistanceDto],
  })
  resistances: ActorRoundResistanceDto[];

  @ApiProperty({ description: 'Fighting styles of the character (workspace spec 032); none for NPCs', type: [ActorRoundFightingStyleDto] })
  fightingStyles: ActorRoundFightingStyleDto[];

  @ApiProperty({ description: 'The fighting style the actor fights with (spec 032)', type: ActorRoundActiveStyleDto, nullable: true })
  activeStyle: ActorRoundActiveStyleDto | null;

  @ApiProperty({ description: 'Strategic items spent in the game (spec 068)', type: [ItemConsumedDto] })
  itemsConsumed: ItemConsumedDto[];

  @ApiProperty({ description: 'Lasting morale and fear RR modifiers (spec 068)', type: [TemporaryModifierDto] })
  temporaryModifiers: TemporaryModifierDto[];

  @ApiProperty({ type: Number, nullable: true, description: 'Fright level of an NPC, from its stat block (spec 068)' })
  frightLevel: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Size the actor suffers criticals as, in steps from medium, when it differs from its size (NPCs, spec 075)',
    example: null,
  })
  criticalSize: number | null;

  @ApiProperty({ description: 'Critical code I of an NPC: every critical is one severity lower, none below A (spec 075)' })
  reduceCriticalSeverity: boolean;

  @ApiProperty({ description: 'Critical code @ of an NPC: a stun is a single -25 for 1 round that does not stack (spec 079)' })
  stunImmune: boolean;

  @ApiProperty({
    description: 'Enc % of the armour the character wears (spec 077), the default armorEncumbrance of its casts; 0 for NPCs',
    example: 15,
  })
  armorEncumbrance: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Height of the actor in feet (spec 077), from the character sheet; null for NPCs until the game master gives it',
    example: 6,
  })
  height: number | null;

  @ApiProperty({ type: [ActorRoundHazardDto], description: 'Falls and falling objects of this round (spec 077)' })
  hazards: ActorRoundHazardDto[];

  @ApiProperty({ type: [LostLimbDto], description: 'Limbs lost for good (spec 079): a lost arm is useless, a lost leg crawls' })
  lostLimbs: LostLimbDto[];

  @ApiProperty({ type: Number, nullable: true, description: 'Round the actor died in (spec 079); null while alive' })
  deathRound: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Rounds left before the soul departs (60 after the death, spec 079): 0 once it left; null while alive',
  })
  soulRoundsLeft: number | null;

  @ApiProperty({
    type: ActorRoundBreathDto,
    nullable: true,
    description: 'The breath the actor holds (spec 079, C4); null while it breathes',
  })
  breath: ActorRoundBreathDto | null;

  @ApiProperty({ description: 'Protected from the extreme temperature of the environment (spec 079, C3)' })
  protectedFromEnvironment: boolean;

  @ApiProperty({ description: 'What the character brought into the game (only in the actor round built from it)', required: false })
  snapshot?: ActorRoundSnapshotDto;

  @ApiProperty({ description: 'Bleeding of the injuries, hits per round' })
  bleeding: number;

  @ApiProperty({ type: String, description: 'Image URL of the actor', example: 'foo/bar/image.png', required: false })
  imageUrl?: string | undefined;

  static fromEntity(entity: ActorRound) {
    const dto = new ActorRoundDto();
    dto.id = entity.id;
    dto.version = entity.version;
    dto.gameId = entity.gameId;
    dto.actorType = entity.actorType;
    dto.actorId = entity.actorId;
    dto.actorName = entity.actorName;
    dto.size = entity.size;
    dto.raceName = entity.raceName;
    dto.level = entity.level;
    dto.factionId = entity.factionId;
    dto.round = entity.round;
    dto.movement = ActorRoundMovementDto.fromEntity(entity.movement);
    dto.initiative = ActorRoundInitiativeDto.fromEntity(entity.initiative);
    dto.actionPoints = entity.actionPoints;
    dto.apModifiers = entity.apModifiers.map(modifier => ActorRoundApModifierDto.fromEntity(modifier));
    dto.apCapacity = [...entity.apCapacity];
    dto.apLedger = entity.apLedger.map(entry => ActorRoundApLedgerEntryDto.fromEntity(entry));
    dto.concentration = entity.concentration().map(focus => ConcentrationFocusDto.fromEntity(focus));
    dto.hp = ActorRoundHPDto.fromEntity(entity.hp);
    dto.fatigue = ActorRoundFatigueDto.fromEntity(entity.fatigue);
    dto.defense = ActorRoundDefenseDto.fromEntity(entity.defense);
    dto.defenseMode = ActorRoundDefenseModeDto.fromEntity(entity.defenseMode);
    dto.phaseLog = entity.getPhaseLog().map(entry => ActorRoundPhaseLogDto.fromEntity(entry));
    dto.attacks = entity.attacks.map(a => ActorRoundAttackDto.fromEntity(a));
    dto.parries = entity.committedParries();
    dto.boReservations = entity.boReservations;
    dto.penalty = ActorRoundPenaltyDto.fromEntity(entity.penalty);
    dto.effects = entity.effects;
    dto.alerts = entity.alerts.map(a => ActorRoundAlertDto.fromEntity(a, entity.round));
    dto.traits = (entity.traits || []).map(t => ActorRoundTraitDto.fromEntity(t));
    dto.rollProfile = rollProfileOf(entity.traits);
    dto.injuries = (entity.injuries || []).map(injury => InjuryDto.fromEntity(injury));
    dto.poisonExposures = (entity.poisonExposures || []).map(exposure => PoisonExposureDto.fromEntity(exposure));
    dto.hpLog = (entity.hpLog || []).map(entry => HpLogEntryDto.fromEntity(entry));
    dto.characterId = entity.characterId;
    dto.npcId = entity.npcId;
    dto.items = (entity.items || []).map(item => ActorRoundItemDto.fromEntity(item));
    if (entity.lastBreakageCheck) dto.lastBreakageCheck = BreakageCheckResultDto.fromEntity(entity.lastBreakageCheck);
    if (entity.lastCriticalRoll) dto.lastCriticalRoll = CriticalAlertRollDto.fromEntity(entity.lastCriticalRoll);
    dto.resistances = (entity.resistances || []).map(each => ({ resistance: each.resistance, totalBonus: each.totalBonus }));
    dto.fightingStyles = (entity.fightingStyles || []).map(style => ActorRoundFightingStyleDto.fromEntity(style));
    dto.activeStyle = entity.activeStyle ? ActorRoundActiveStyleDto.fromEntity(entity.activeStyle) : null;
    dto.itemsConsumed = (entity.itemsConsumed || []).map(each => ItemConsumedDto.fromEntity(each));
    dto.temporaryModifiers = (entity.temporaryModifiers || []).map(each => TemporaryModifierDto.fromEntity(each));
    dto.frightLevel = entity.frightLevel ?? null;
    dto.criticalSize = entity.criticalSize ?? null;
    dto.reduceCriticalSeverity = entity.reduceCriticalSeverity ?? false;
    dto.stunImmune = entity.stunImmune ?? false;
    dto.armorEncumbrance = entity.armorEncumbrance ?? 0;
    dto.height = entity.height ?? null;
    dto.hazards = (entity.hazards || []).map(hazard => ActorRoundHazardDto.fromEntity(hazard));
    dto.lostLimbs = (entity.lostLimbs || []).map(limb => LostLimbDto.fromEntity(limb));
    dto.deathRound = entity.deathRound ?? null;
    dto.soulRoundsLeft = entity.soulRoundsLeft();
    dto.breath = entity.breath ? ActorRoundBreathDto.fromEntity(entity.breath, entity) : null;
    dto.protectedFromEnvironment = entity.protectedFromEnvironment ?? false;
    dto.snapshot = entity.snapshot ? ActorRoundSnapshotDto.fromEntity(entity.snapshot) : undefined;
    dto.bleeding = entity.getBleeding();
    dto.imageUrl = entity.imageUrl;
    return dto;
  }
}

export class CharacterRoundPageDto {
  constructor(content: ActorRoundDto[], pagination: PaginationDto) {
    this.content = content;
    this.pagination = pagination;
  }

  @ApiProperty({ type: [ActorRoundDto], description: 'Character Rounds' })
  content: ActorRoundDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;
}
