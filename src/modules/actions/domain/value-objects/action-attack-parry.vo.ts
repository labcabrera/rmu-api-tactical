import { ParryType } from './parry-type';

export class ActionParry {
  constructor(
    public readonly id: string,
    /** Actor identifier. Can be the target of the attack or a protector */
    public readonly actorId: string,
    /** Actor who is the target of the attack (in two handed melee combat one attacker can attack two targets) */
    public readonly targetActorId: string,
    public readonly parryType: ParryType,
    /** Name of the attack used to parry */
    public readonly parryAvailable: number,
    public parry: number,
  ) {}
}
