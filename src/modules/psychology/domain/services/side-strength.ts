import type { GameSide } from '../../../games/domain/value-objects/game-side.vo.js';

/** What the strength of a side reads of an actor round (an `ActorRound`, or a plain object in the tests). */
export interface StrengthMember {
  factionId: string;
  level?: number | null;
  hp?: { max: number; current: number } | null;
  isIncapacitated(): boolean;
  isFled(): boolean;
}

/**
 * The strength of a side (workspace spec 100, decisions 11-13): its levels and heads standing, incapacitated (dead,
 * dying, unconscious, incapacitated, paralyzed) and fled (routed or broken), and its combined hits. Every member counts,
 * the fallen too, so the hits of who falls stay lost.
 */
export interface SideStrength {
  sideId: string;
  totalLevels: number;
  standingLevels: number;
  incapacitatedLevels: number;
  fledLevels: number;
  totalCount: number;
  standingCount: number;
  incapacitatedCount: number;
  fledCount: number;
  hpCurrent: number;
  hpMax: number;
}

/** The level of an actor for its strength: 1 at least. */
export const strengthLevel = (member: Pick<StrengthMember, 'level'>): number => Math.max(1, member.level ?? 1);

/** Fallen levels of a side: incapacitated and fled. */
export const fallenLevels = (strength: SideStrength): number => strength.incapacitatedLevels + strength.fledLevels;

/** The members of a side, by the factions of the actor rounds; the actor rounds without a faction count in none. */
export const sideMembers = <T extends Pick<StrengthMember, 'factionId'>>(actorRounds: T[], side: GameSide): T[] =>
  actorRounds.filter(actorRound => !!actorRound.factionId && side.factionIds.includes(actorRound.factionId));

/** One strength per side, in the order of the sides (workspace spec 100, decision 15). */
export const sideStrength = (actorRounds: StrengthMember[], sides: GameSide[]): SideStrength[] =>
  sides.map(side => {
    const strength: SideStrength = {
      sideId: side.id,
      totalLevels: 0,
      standingLevels: 0,
      incapacitatedLevels: 0,
      fledLevels: 0,
      totalCount: 0,
      standingCount: 0,
      incapacitatedCount: 0,
      fledCount: 0,
      hpCurrent: 0,
      hpMax: 0,
    };
    for (const member of sideMembers(actorRounds, side)) {
      const level = strengthLevel(member);
      strength.totalLevels += level;
      strength.totalCount += 1;
      if (member.isIncapacitated()) {
        strength.incapacitatedLevels += level;
        strength.incapacitatedCount += 1;
      } else if (member.isFled()) {
        strength.fledLevels += level;
        strength.fledCount += 1;
      } else {
        strength.standingLevels += level;
        strength.standingCount += 1;
      }
      strength.hpCurrent += Math.max(0, member.hp?.current ?? 0);
      strength.hpMax += member.hp?.max ?? 0;
    }
    return strength;
  });
