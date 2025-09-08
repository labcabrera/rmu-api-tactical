import { ActionStatus } from './action.aggregate';

export class ActionAttack {
  constructor(
    public attackId: string | undefined,
    public attackName: string,
    public targetId: string,
    public parry: number,
    public status: ActionStatus,
  ) {}
}
