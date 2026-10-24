import { ActionParry } from '../../../../actions/domain/value-objects/action-attack-parry.vo';
import { ParryType } from '../../../../actions/domain/value-objects/parry-type.vo';

export class DeclareActorParryCommand {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
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

  /** The OB the parry spends: the parry, plus the protect penalty when protecting with any amount (Table 9-7c). */
  static fromParry(gameId: string, sourceActorId: string, round: number, parry: ActionParry, userId: string, roles: string[]) {
    const spent = parry.parry > 0 ? parry.parry - (parry.penalty || 0) : 0;
    return new DeclareActorParryCommand(
      parry.id,
      gameId,
      parry.actorId,
      parry.targetActorId,
      sourceActorId,
      round,
      parry.parryType,
      spent,
      userId,
      roles,
    );
  }
}
