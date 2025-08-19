export class DeleteItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly roles?: string[],
  ) {}
}
