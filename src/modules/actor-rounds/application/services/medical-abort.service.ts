import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Action } from '../../../actions/domain/aggregates/action.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../ports/actor-round-repository.port.js';

/**
 * Workspace spec 068, decision 4: a `medical` action interrupted (another action declared, the healer unable in the
 * upkeep, the action deleted) aborts its treatment on the patient: pressure bleeds again, the rest loses its progress.
 */
@Injectable()
export class MedicalAbortService {
  private readonly logger = new Logger(MedicalAbortService.name);

  constructor(@Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository) {}

  /**
   * Aborts the treatment of the medical actions among `actions` (their `medical.state` becomes `aborted`) on the actor
   * rounds of the patient of each `round` (the action's by default). Actor rounds in `known` are changed in memory and
   * left for the caller to save; the others are read and saved here. Answers the actions it aborted.
   */
  async abort(actions: Action[], options: { known?: ActorRound[]; rounds?: (action: Action) => number[] } = {}): Promise<Action[]> {
    const aborted: Action[] = [];
    for (const action of actions) {
      const medical = action.medical;
      if (action.actionType !== 'medical' || !medical || (medical.state !== 'pending' && medical.state !== 'in-progress')) {
        continue;
      }
      medical.state = 'aborted';
      aborted.push(action);
      const rounds = options.rounds ? options.rounds(action) : [action.round];
      for (const round of rounds) {
        const known = (options.known ?? []).find(each => each.actorId === medical.patientActorId && each.round === round);
        const patient = known ?? (await this.actorRoundRepository.findByActorIdAndRound(action.gameId, medical.patientActorId, round));
        if (patient?.abortTreatment(medical.originActionId) && !known) {
          await this.actorRoundRepository.update(patient);
        }
      }
      this.logger.log(`Medical action ${action.id} of ${action.actorId} aborted: the treatment of ${medical.patientActorId} stops`);
    }
    return aborted;
  }
}
