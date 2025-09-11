export class DeclareParryCommand {
  constructor(
    public readonly actionId: string,
    public readonly parries: DeclareParryItemDto[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class DeclareParryItemDto {
  public parryActorId: string;
  public parry: number;
}
