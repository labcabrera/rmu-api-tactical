export class DeclareParryCommand {
  constructor(
    public readonly actionId: string,
    public readonly parries: Map<string, number>,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
