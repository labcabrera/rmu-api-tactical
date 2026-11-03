export const STRATEGIC_MEMBER_ROLES = ['master', 'player', 'spectator'] as const;

export type StrategicMemberRole = (typeof STRATEGIC_MEMBER_ROLES)[number];

/** A member of the strategic game, copied from its events (workspace spec 072, decision 13). */
export interface StrategicMember {
  userId: string;
  role: StrategicMemberRole;
}

/** What the requesting user does with a tactical game (workspace spec 072, contract 23). */
export type TacticalGameAccess = 'read' | 'act' | 'manage';

export const StrategicMembers = {
  /** The members of a strategic event, `[{userId, userName, role, joinedAt}]`, without what tactical does not keep. */
  fromEvent(members: unknown): StrategicMember[] {
    if (!Array.isArray(members)) return [];
    return (members as unknown[])
      .filter((member): member is { userId: string; role: string } => {
        const { userId, role } = (member ?? {}) as { userId?: unknown; role?: unknown };
        return typeof userId === 'string' && !!userId && typeof role === 'string';
      })
      .filter(member => (STRATEGIC_MEMBER_ROLES as readonly string[]).includes(member.role))
      .map(member => ({ userId: member.userId, role: member.role as StrategicMemberRole }));
  },

  /** The user ids of a list of players, without blanks or repeats. */
  players(players: unknown): string[] {
    if (!Array.isArray(players)) return [];
    return [...new Set(players.filter((player): player is string => typeof player === 'string' && !!player))];
  },
};
