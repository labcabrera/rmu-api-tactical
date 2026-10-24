import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ResistanceKind, ResistanceModifier } from '../../../domain/services/resistance-roll.calculator.js';

/** `POST /v1/actor-rounds/:id/resistance-rolls` (workspace spec 022, decision 8). */
export class ResistanceRollCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly kind: ResistanceKind,
    public readonly attackLevel: number,
    public readonly roll: number,
    public readonly modifiers: ResistanceModifier[],
    /** The game master's bonus, for an actor without one in its sheet (NPCs). */
    public readonly bonus: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
