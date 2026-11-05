import type { SizeId } from '../../../../shared/domain/size-scale.js';
import type { HazardKind } from '../../../domain/value-objects/actor-round-hazard.vo.js';

/** What the game master sends for a fall or a falling object (workspace spec 077, decision D2). */
export interface HazardRequest {
  kind: HazardKind;
  distanceFeet: number;
  roll: number;
  criticalRolls: number[];
  db: number | null;
  note: string | null;
  deliberate: boolean;
  heightFeet: number | null;
  fallControlActionId: string | null;
  objectSize: SizeId | null;
  weightLbs: number | null;
  shield: boolean;
}

export class ResolveHazardCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly request: HazardRequest,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
