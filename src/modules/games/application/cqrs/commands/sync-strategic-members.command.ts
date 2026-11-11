import type { StrategicMember } from '../../../domain/value-objects/strategic-member.vo.js';

/** A strategic game created or changed (workspace spec 072, decision 13): its members reach its tactical games. */
export class SyncStrategicMembersCommand {
  constructor(
    public readonly strategicGameId: string,
    public readonly strategicGameOwner: string | undefined,
    /** Undefined in events of strategic versions before spec 071: the members stay as they are. */
    public readonly members: StrategicMember[] | undefined,
  ) {}
}
