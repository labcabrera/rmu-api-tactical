import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/entities/actor-round.aggregate';
import { ValidationError } from '../../../shared/domain/errors';
import { Character } from '../../../strategic/application/ports/character.port';
import type { ManeuverPort } from '../../application/ports/maneuver.port';
import { ActionMovementBonus } from '../entities/action-movement.vo';
import { Action } from '../entities/action.aggregate';

@Injectable()
export class MovementProcessorService {
  private static readonly difficultyMap: Map<string, number> = new Map([
    ['c', 70],
    ['s', 50],
    ['r', -30],
    ['e', 20],
    ['l', 10],
    ['m', 0],
    ['h', -10],
    ['vh', -20],
    ['xh', -30],
    ['sf', -50],
    ['a', -70],
    ['ni', -100],
  ]);

  private static readonly paceMap: Map<string, number> = new Map([
    ['creep', 0.125],
    ['walk', 0.25],
    ['jog', 0.5],
    ['run', 0.75],
    ['sprint', 1],
    ['dash', 1],
  ]);

  constructor(@Inject('ManeuverPort') private readonly maneuverClient: ManeuverPort) {}

  async process(roll: number | undefined, action: Action, character: Character, actorRound: ActorRound): Promise<void> {
    if (!action.movement || !action.movement.modifiers) {
      throw new Error('Action does not have movement data');
    } else if (!action.actionPoints) {
      throw new Error('Action does not have action points data');
    }
    let percent = 100;
    let critical: string | undefined = undefined;
    let message: string | undefined = undefined;
    if (action.movement.modifiers.requiredManeuver) {
      if (!roll) {
        throw new Error('Roll is required for movement with requiredManeuver');
      }
      const modifiers: ActionMovementBonus[] = [];
      modifiers.push({ key: 'difficulty', value: this.getGetDifificultyModifier(action.movement.modifiers.difficulty!) });
      modifiers.push({ key: 'armor-penalty', value: character.equipment.maneuverPenalty });
      modifiers.push({ key: 'custom-bonus', value: action.movement.modifiers.customBonus || 0 });
      actorRound.penalties.forEach((penalty) => {
        //TODO check if penalty applies to movement from core law
        modifiers.push(penalty);
      });
      modifiers.push({ key: 'roll', value: roll });
      action.movement.roll = {
        rollModifiers: modifiers.filter((mod) => mod.value !== 0),
        roll: roll,
        totalRoll: modifiers.reduce((sum, mod) => sum + mod.value, 0),
      };
      const maneuverResult = await this.maneuverClient.percent(action.movement.roll.totalRoll);
      percent = maneuverResult.percent;
      critical = maneuverResult.critical;
      message = maneuverResult.message;
    }
    const bmr = character.movement.baseMovementRate;
    const paceMultiplier = this.getPaceMultiplier(action.movement.modifiers.pace);
    const distance = bmr * percent * action.actionPoints * paceMultiplier;
    action.movement.calculated = {
      bmr: bmr,
      paceMultiplier: paceMultiplier,
      percent: percent,
      distance: distance,
      distanceAdjusted: distance,
      critical: critical,
      description: message || `Completed at ${percent}% success`,
    };
  }

  private getPaceMultiplier(pace: string): number {
    const value = MovementProcessorService.paceMap.get(pace);
    if (value === undefined) {
      throw new ValidationError(`Unknown pace: ${pace}`);
    }
    return value;
  }

  private getGetDifificultyModifier(difficulty: string): number {
    const value = MovementProcessorService.difficultyMap.get(difficulty);
    if (value === undefined) {
      throw new ValidationError(`Unknown difficulty: ${difficulty}`);
    }
    return value;
  }
}
