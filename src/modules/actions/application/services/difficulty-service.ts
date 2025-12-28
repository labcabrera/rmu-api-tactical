import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors';
import { ManeuverDifficulty } from '../../domain/value-objects/maneuver-dificulty.vo';

@Injectable()
export class DifficultyService {
  private static readonly difficultyMap: Map<ManeuverDifficulty, number> = new Map([
    ['casual', 70],
    ['simple', 50],
    ['routine', 30],
    ['easy', 20],
    ['light', 10],
    ['medium', 0],
    ['hard', -10],
    ['very_hard', -20],
    ['extremely_hard', -30],
    ['sheer_folly', -50],
    ['absurd', -70],
    ['nigh_impossible', -100],
  ]);

  getDifficultyModifier(difficulty: ManeuverDifficulty): number {
    const value = DifficultyService.difficultyMap.get(difficulty);
    if (value === undefined) {
      throw new ValidationError(`Unknown difficulty: ${difficulty}`);
    }
    return value;
  }
}
