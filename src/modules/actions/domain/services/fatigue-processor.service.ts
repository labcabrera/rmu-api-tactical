import { Injectable } from '@nestjs/common';
import { StrategicGame } from '../../../strategic/application/ports/strategic-game.port';
import { Action } from '../entities/action.aggregate';

@Injectable()
export class FatigueProcessorService {
  process(action: Action, strategicGame: StrategicGame | undefined): void {
    if (!action.actionPoints) {
      throw new Error('Action does not have action points defined');
    }
    let value: number | undefined = undefined;
    switch (action.actionType) {
      case 'movement':
        value = this.getMovementFatigue(action);
        break;
      case 'attack':
        value = this.getCombatFatigue(action);
        break;
    }
    if (value && strategicGame && strategicGame.options && strategicGame.options.fatigueMultiplier) {
      value = value * strategicGame.options.fatigueMultiplier;
    }
    if (value) {
      value = action.actionPoints * value;
    }
    action.fatigue = value;
  }

  private getCombatFatigue(action: Action): number | undefined {
    //TODO check only for melee attacks
    // check every 6 rounds
    return 4.16;
  }

  private getMovementFatigue(action: Action): number | undefined {
    if (action.movement?.modifiers.skillId) {
      switch (action.movement.modifiers.skillId) {
        case 'climbing':
        case 'swimming':
          // check every 5 min
          return 4.16;
        default:
          break;
      }
    }
    return this.getRunningFatigue(action);
  }

  private getRunningFatigue(action: Action): number | undefined {
    if (!action.movement || !action.movement.modifiers || !action.movement.modifiers.pace) {
      throw new Error('Action does not have movement data');
    }
    switch (action.movement.modifiers.pace) {
      case 'jog':
        // check every 5 min
        return 0.14;
      case 'run':
        // check every 1 min
        return 4.16;
      case 'sprint':
        // check every 2 rounds
        return 12.5;
      case 'dash':
        // check every round
        return 25;
    }
    return undefined;
  }
}
