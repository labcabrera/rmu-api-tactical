import { ValidationError } from '../../../shared/domain/errors/errors';

export type DefenseLevel = 'none' | 'passive' | 'partial' | 'full';

export const DEFENSE_LEVELS: DefenseLevel[] = ['none', 'passive', 'partial', 'full'];

/**
 * How the actor dodges and blocks this round (§9.6 Dodging, Shields). Declared each round; `full` costs the whole
 * round (4 AP), so it is only set by completing a dodge action.
 */
export class ActorRoundDefenseMode {
  constructor(
    public readonly dodge: DefenseLevel,
    public readonly block: DefenseLevel,
  ) {}

  static none(): ActorRoundDefenseMode {
    return new ActorRoundDefenseMode('none', 'none');
  }

  static of(dodge: DefenseLevel, block: DefenseLevel): ActorRoundDefenseMode {
    if (!DEFENSE_LEVELS.includes(dodge)) throw new ValidationError(`Invalid dodge level ${dodge}`);
    if (!DEFENSE_LEVELS.includes(block)) throw new ValidationError(`Invalid block level ${block}`);
    // A dodge and a block of the same kind don't add up (passive dodge and passive block...).
    if (dodge !== 'none' && dodge === block) {
      throw new ValidationError(`Dodge and block cannot both be ${dodge}`);
    }
    return new ActorRoundDefenseMode(dodge, block);
  }
}
