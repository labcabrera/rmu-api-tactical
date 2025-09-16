import { ParryType } from '../../../../actions/domain/value-objects/action-attack.vo';

export class DeclareActorParryCommand {
  constructor(
    public readonly id: string,
    /** Actor who is parrying or protecting*/
    public readonly actorId: string,
    public readonly targetActorId: string,
    public readonly sourceActorId: string,
    public readonly round: number,
    public readonly parryType: ParryType,
    public readonly targetAttackName: string | undefined,
    public readonly parry: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
