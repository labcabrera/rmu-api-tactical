export class AddItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly name: string | undefined,
    public readonly itemTypeId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
