import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors';
import { Difficulty } from '../../domain/value-objects/dificulty.vo';

@Injectable()
export class DifficultyService {
  private static readonly difficultyMap: Map<Difficulty, number> = new Map([
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

  getDifficultyModifier(difficulty: Difficulty): number {
    const value = DifficultyService.difficultyMap.get(difficulty);
    if (value === undefined) {
      throw new ValidationError(`Unknown difficulty: ${difficulty}`);
    }
    return value;
  }
}
