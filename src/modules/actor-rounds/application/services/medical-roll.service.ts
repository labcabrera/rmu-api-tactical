import { Inject, Injectable } from '@nestjs/common';
import { type ManeuverPort, MANEUVER_PORT } from '../../../actions/application/ports/maneuver.port.js';
import { KeyValueModifier, type ModifierParams } from '../../../actions/domain/value-objects/key-value-modifier.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../games/domain/aggregates/game.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { type CharacterPort, CHARACTER_PORT } from '../../../strategic/application/ports/character.port.js';
import { ActorRound } from '../../domain/aggregates/actor-round.js';
import { MEDICAL_RESULTS, type MedicalOutcome } from '../../domain/services/injury-treatment.js';
import type { InjuryHealer } from '../../domain/value-objects/injury.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../ports/actor-round-repository.port.js';

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
  /** The roll, the healer's Medicine and penalties and the difficulty, each with its rule (workspace spec 052). */
  breakdown: KeyValueModifier[];
}

/** Rule references of the medical roll (Core Law). */
export const MEDICAL_RULES = { medicine: 'Table 3-15', difficulty: '§5.1', healing: '§13.1' } as const;

/**
 * A medical roll in a tactical game (spec 013, §3): the healer's Medicine bonus (`skills['medicine'].totalBonus` of its
 * strategic character, since actor rounds keep no skills) and penalties, plus the roll and the difficulty, resolved with
 * the medical maneuver table of core.
 */
@Injectable()
export class MedicalRollService {
  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
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

  /** `difficultyParams` says where the difficulty comes from (the procedure and the injury), for its explanation. */
  async roll(
    patient: ActorRound,
    request: HealerRequest,
    roll: number,
    difficulty: number,
    difficultyParams?: ModifierParams,
  ): Promise<MedicalRoll> {
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
    const breakdown = [
      new KeyValueModifier('roll', roll),
      new KeyValueModifier('medicine', healer.bonus, 'skill', 'healer', MEDICAL_RULES.medicine, {
        healer: healer.name,
        ...(healer.external ? { external: true } : {}),
      }),
      new KeyValueModifier('difficulty', difficulty, 'situation', 'injury', MEDICAL_RULES.difficulty, difficultyParams),
      new KeyValueModifier('healer-penalty', penalty, 'penalty', 'healer'),
    ].filter((modifier, index) => index < 3 || modifier.value !== 0);
    return {
      healer,
      healerPenalty: penalty,
      roll,
      difficulty,
      total,
      breakdown,
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
