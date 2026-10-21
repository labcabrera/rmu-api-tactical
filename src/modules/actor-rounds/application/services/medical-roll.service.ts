import { Inject, Injectable } from '@nestjs/common';
import type { ManeuverPort } from '../../../actions/application/ports/maneuver.port';
import type { GameRepository } from '../../../games/application/ports/game.repository';
import { Game } from '../../../games/domain/aggregates/game.aggregate';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors';
import type { CharacterPort } from '../../../strategic/application/ports/character.port';
import { ActorRound } from '../../domain/aggregates/actor-round.aggregate';
import { MEDICAL_RESULTS, MedicalOutcome } from '../../domain/services/injury-treatment';
import { InjuryHealer } from '../../domain/value-objets/injury.vo';
import type { ActorRoundRepository } from '../ports/actor-round.repository';

/** Skill of the healer (strategic skill id). */
export const MEDICINE_SKILL_ID = 'medicine';

/** Absolute maneuver table of core for medical rolls (Table 3-15). */
const MEDICAL_TABLE = 'medical';

/** Healer of a medical roll: another actor of the game (or the patient), or an external one with a manual bonus. */
export interface HealerRequest {
  healerActorId?: string;
  healer?: { name: string; bonus: number };
}

export interface MedicalRoll {
  healer: InjuryHealer;
  /** Penalties of a healer actor of the game (negative), in the total. */
  healerPenalty: number;
  roll: number;
  difficulty: number;
  total: number;
  outcome: MedicalOutcome;
}

/**
 * A medical roll in a tactical game (spec 013, §3): the healer's Medicine bonus (`skills['medicine'].totalBonus` of its
 * strategic character, since actor rounds keep no skills) and penalties, plus the roll and the difficulty, resolved with
 * the medical maneuver table of core.
 */
@Injectable()
export class MedicalRollService {
  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
  ) {}

  /** The patient's actor round and its game, which must not be finished. */
  async loadPatient(actorRoundId: string): Promise<{ patient: ActorRound; game: Game }> {
    const patient = await this.actorRoundRepository.findById(actorRoundId);
    if (!patient) throw new NotFoundError('Actor round', actorRoundId);
    const game = await this.gameRepository.findById(patient.gameId);
    if (!game) throw new NotFoundError('Game', patient.gameId);
    game.checkNotFinished();
    return { patient, game };
  }

  async roll(patient: ActorRound, request: HealerRequest, roll: number, difficulty: number): Promise<MedicalRoll> {
    if (typeof roll !== 'number' || !Number.isFinite(roll)) {
      throw new ValidationError('Required roll value');
    }
    const { healer, penalty } = await this.resolveHealer(patient, request);
    const total = roll + healer.bonus + difficulty + penalty;
    const response = await this.maneuverPort.absolute(total, MEDICAL_TABLE);
    const result = MEDICAL_RESULTS.find(each => each === response.result);
    if (!result) {
      throw new ValidationError(`Unexpected medical result ${response.result}`);
    }
    const effectValue = (status: string) => response.effects?.find(effect => effect.status === status)?.value ?? 0;
    return {
      healer,
      healerPenalty: penalty,
      roll,
      difficulty,
      total,
      outcome: {
        result,
        recoveryModifier: effectValue('recoveryRollModifier'),
        injuryPenalty: Math.abs(effectValue('injuryPenalty')),
        message: response.message,
      },
    };
  }

  private async resolveHealer(patient: ActorRound, request: HealerRequest): Promise<{ healer: InjuryHealer; penalty: number }> {
    if (request.healerActorId) {
      const healerRound =
        request.healerActorId === patient.actorId
          ? patient
          : await this.actorRoundRepository.findByActorIdAndRound(patient.gameId, request.healerActorId, patient.round);
      if (!healerRound) {
        throw new NotFoundError('Healer actor', request.healerActorId, 'err-healer-not-found');
      }
      if (healerRound.isIncapacitated()) {
        throw new ValidationError(`Healer ${healerRound.actorName} cannot act`, 'err-healer-not-able');
      }
      const bonus = healerRound.actorType === 'character' ? await this.medicineBonus(healerRound.characterId ?? healerRound.actorId) : 0;
      return {
        healer: { actorId: healerRound.actorId, characterId: healerRound.characterId, name: healerRound.actorName, bonus },
        penalty: Math.min(0, healerRound.getPenaltySum()),
      };
    }
    if (request.healer?.name) {
      return { healer: { name: request.healer.name, external: true, bonus: request.healer.bonus || 0 }, penalty: 0 };
    }
    throw new ValidationError('A healer actor or an external healer is required', 'err-healer-required');
  }

  private async medicineBonus(characterId: string): Promise<number> {
    const character = await this.characterClient.findById(characterId);
    return character?.skills?.find(skill => skill.skillId === MEDICINE_SKILL_ID)?.totalBonus ?? 0;
  }
}
