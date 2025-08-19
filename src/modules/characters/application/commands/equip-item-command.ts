export class EquipItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly itemId: string,
    public readonly slot: string,
  ) {}
}
