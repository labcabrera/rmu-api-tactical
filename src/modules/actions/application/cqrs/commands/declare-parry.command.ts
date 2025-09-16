export class DeclareParryCommand {
  constructor(
    public readonly actionId: string,
    public readonly parries: DeclareParryItem[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class DeclareParryItem {
  constructor(
    public readonly parryId: string,
    public readonly parry: number,
  ) {}
}
