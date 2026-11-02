import { Actor } from '../../../../games/domain/value-objects/actor.vo.js';

export class CreateActorRoundCommand {
  constructor(
    public readonly gameId: string,
    public readonly actor: Actor,
    public readonly round: number,
  ) {}
}
