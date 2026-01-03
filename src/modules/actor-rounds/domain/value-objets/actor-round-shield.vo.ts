import { ShieldType } from './shield-type.vo';

export class ActorRoundShield {
  constructor(
    public readonly type: ShieldType,
    public readonly shieldDb: number,
    public readonly maxBlocks: number,
    public readonly currentBlocks: number,
  ) {}
}
