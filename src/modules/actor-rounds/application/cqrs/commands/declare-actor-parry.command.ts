import { ActionParry } from '../../../../actions/domain/value-objects/action-attack-parry.vo';
import { ParryType } from '../../../../actions/domain/value-objects/parry-type';

export class DeclareActorParryCommand {
  constructor(
    public readonly id: string,
    /** Actor who is parrying or protecting*/
    public readonly actorId: string,
    public readonly targetActorId: string,
    public readonly sourceActorId: string,
    public readonly round: number,
    public readonly parryType: ParryType,
    public readonly parry: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}

  static fromParry(sourceActorId: string, round: number, parry: ActionParry, userId: string, roles: string[]) {
    return new DeclareActorParryCommand(
      parry.id,
      parry.actorId,
      parry.targetActorId,
      sourceActorId,
      round,
      parry.parryType,
      parry.parry,
      userId,
      roles,
    );
  }
}
