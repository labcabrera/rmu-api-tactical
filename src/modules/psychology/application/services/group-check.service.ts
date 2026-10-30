import { Inject, Injectable } from '@nestjs/common';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { UNCONSCIOUS } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../games/domain/aggregates/game.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { type ActorSheet, ActorSheetService } from '../../../actor-rounds/application/services/actor-sheet.service.js';
import { openEndedRoll } from '../../domain/services/open-ended-roll.js';

/** Skill of the leader (§14.2, §14.3) and of the source of an intimidation (§14.2): strategic skill ids. */
export const LEADERSHIP_SKILL_ID = 'leadership';
export const INFLUENCE_SKILL_ID = 'influence';
export const INTIMIDATION_SPECIALIZATION = 'intimidation';

/** Talent of the leader that adds to the fear RRs of its followers, per tier (workspace spec 022, decision 7). */
export const LOOK_OF_EAGLES = 'look-of-eagles';
export const LOOK_OF_EAGLES_FEAR_RR_PER_TIER = 2;

/**
 * Who takes a group check (workspace spec 022, decision 6): the actors of some factions and some single actors of the
 * game; with neither, the faction of `defaultActorId`.
 */
export interface GroupSelection {
  factionIds?: string[];
  actorIds?: string[];
}

export interface LeaderRequest {
  actorId: string;
  /** The followers acknowledge the leader and know it is present (§14.3); true by default. */
  recognized?: boolean;
  /** For a leader without a sheet (NPC): its Leadership ranks and bonus. */
  leadershipRanks?: number;
  leadershipBonus?: number;
}

export interface Leader {
  actorRound: ActorRound;
  recognized: boolean;
  leadershipRanks: number;
  leadershipBonus: number;
  lookOfEaglesTier: number;
  /** What the leader adds to the fear RRs of its followers: ranks and Look of Eagles, or nothing if not recognized. */
  fearRrBonus: number;
}

export interface GroupRoll {
  roll: number;
  rolledByServer: boolean;
  unmodified?: number;
}

/** The game, the group and the leader of a fear, morale or rally check, read once per request. */
@Injectable()
export class GroupCheckService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    private readonly sheets: ActorSheetService,
  ) {}

  /** The game in progress and the actor rounds of its current round. */
  async load(gameId: string): Promise<{ game: Game; rounds: ActorRound[] }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId);
    game.checkNotFinished();
    if (game.round < 1) {
      throw new ValidationError(`Game ${game.name} is not in progress`, 'err-game-not-started');
    }
    const page = await this.actorRoundRepository.findByRsql(`gameId==${game.id};round==${game.round}`, 0, 1000);
    return { game, rounds: page.content };
  }

  /** The members of the group, in the order of the game; an empty group is an error. */
  static group(rounds: ActorRound[], selection: GroupSelection | undefined, defaultActorId: string | undefined): ActorRound[] {
    let factionIds = selection?.factionIds ?? [];
    const actorIds = selection?.actorIds ?? [];
    if (factionIds.length === 0 && actorIds.length === 0) {
      const anchor = defaultActorId ? GroupCheckService.find(rounds, defaultActorId) : undefined;
      if (!anchor) {
        throw new ValidationError('Choose the group: factions, actors or a leader', 'err-group-required');
      }
      factionIds = [anchor.factionId];
    }
    const unknown = actorIds.filter(id => !rounds.some(round => round.actorId === id));
    if (unknown.length > 0) {
      throw new NotFoundError('Actor', unknown.join(', '), 'err-group-actor-not-found');
    }
    const members = rounds.filter(round => factionIds.includes(round.factionId) || actorIds.includes(round.actorId));
    if (members.length === 0) {
      throw new ValidationError('The group has no actors in this round', 'err-group-empty');
    }
    return members;
  }

  static find(rounds: ActorRound[], actorId: string): ActorRound | undefined {
    return rounds.find(round => round.actorId === actorId);
  }

  /** Dead or unconscious actors take no check. */
  static isOut(round: ActorRound): boolean {
    return round.isDead() || round.hasEffect(UNCONSCIOUS);
  }

  async leader(rounds: ActorRound[], request: LeaderRequest): Promise<Leader> {
    const actorRound = GroupCheckService.find(rounds, request.actorId);
    if (!actorRound) throw new NotFoundError('Leader', request.actorId, 'err-leader-not-found');
    const sheet = await this.sheet(actorRound);
    const skill = sheet?.skills?.find(each => each.skillId === LEADERSHIP_SKILL_ID);
    const leadershipRanks = request.leadershipRanks ?? skill?.ranks ?? 0;
    const leadershipBonus = request.leadershipBonus ?? skill?.totalBonus ?? 0;
    const lookOfEaglesTier = actorRound.traitTier(LOOK_OF_EAGLES);
    const recognized = request.recognized !== false;
    const fearRrBonus = recognized ? leadershipRanks + LOOK_OF_EAGLES_FEAR_RR_PER_TIER * lookOfEaglesTier : 0;
    return { actorRound, recognized, leadershipRanks, leadershipBonus, lookOfEaglesTier, fearRrBonus };
  }

  /**
   * Intimidation ranks of an actor (§14.2: the fright level of its threats), or the ones sent: an NPC whose stat block
   * does not give them has to send them (spec 055).
   */
  async intimidationRanks(rounds: ActorRound[], actorId: string, ranks: number | undefined): Promise<number> {
    const actorRound = GroupCheckService.find(rounds, actorId);
    if (!actorRound) throw new NotFoundError('Intimidating actor', actorId, 'err-intimidator-not-found');
    if (ranks !== undefined) {
      return ranks;
    }
    const sheet = await this.sheet(actorRound);
    const skills = sheet?.skills ?? [];
    const skill =
      skills.find(each => each.skillId === INFLUENCE_SKILL_ID && each.specialization === INTIMIDATION_SPECIALIZATION) ??
      skills.find(each => each.skillId === INTIMIDATION_SPECIALIZATION);
    if (!sheet || (sheet.npc && skill?.ranks === undefined)) {
      throw new ValidationError(`Send the Intimidation ranks of ${actorRound.actorName}`, 'err-intimidation-ranks-required');
    }
    return skill?.ranks ?? 0;
  }

  /** The client's roll, or an open-ended one made here. */
  static roll(roll: number | undefined, random?: () => number): GroupRoll {
    if (roll !== undefined && roll !== null) {
      if (!Number.isFinite(roll)) throw new ValidationError('A roll must be a number', 'err-group-invalid-roll');
      return { roll, rolledByServer: false };
    }
    const rolled = openEndedRoll(random);
    return { roll: rolled.roll, unmodified: rolled.unmodified, rolledByServer: true };
  }

  async save(rounds: ActorRound[]): Promise<ActorRound[]> {
    const saved: ActorRound[] = [];
    for (const round of rounds) {
      saved.push(await this.actorRoundRepository.update(round));
    }
    return saved;
  }

  /** The character sheet, or the stat block of an NPC (spec 055). */
  private sheet(actorRound: ActorRound): Promise<ActorSheet | undefined> {
    return this.sheets.find(actorRound);
  }
}
