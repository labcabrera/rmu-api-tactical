/** A faction deleted in strategic (spec 055): it leaves the games still being set up, with its actors. */
export class RemoveDeletedFactionCommand {
  constructor(public readonly factionId: string) {}
}
