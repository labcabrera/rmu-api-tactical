/** `PATCH v1/actions/:id/medical/resolve` (workspace spec 068): the next round of 4 AP of a `medical` action. */
export class ResolveMedicalCommand {
  constructor(
    public readonly actionId: string,
    public readonly roll: number | null | undefined,
    public readonly unmodifiedRoll: number | null | undefined,
    public readonly heatHitsRoll: number | null | undefined,
    public readonly heatCriticalRoll: number | null | undefined,
    public readonly herbalismRoll: number | null | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

/** `PATCH v1/actions/:id/use-item/resolve` (workspace spec 068): a `use_item` action with its AP is resolved. */
export class ResolveUseItemCommand {
  constructor(
    public readonly actionId: string,
    /** Hits healed; missing: the declaration's, or rolled in the range of the item. */
    public readonly roll: number | null | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
