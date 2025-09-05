import { Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/entities/actor-round.entity';
import { Character } from '../../../strategic/application/ports/out/character-client';
import { ActionMovementBonus } from '../entities/action-movement.entity';
import { Action } from '../entities/action.entity';

@Injectable()
export class MovementProcessorService {
  processMovementRoll(roll: number | undefined, action: Action, character: Character, actorRound: ActorRound): void {
    if (!action.movement || !action.movement.modifiers) {
      throw new Error('Action does not have movement data');
    } else if (!action.actionPoints) {
      throw new Error('Action does not have action points data');
    }
    let percent = 100;
    if (action.movement.modifiers.requiredManeuver) {
      if (!roll) {
        throw new Error('Roll is required for movement with requiredManeuver');
      }
      const modifiers: ActionMovementBonus[] = [];
      modifiers.push({ key: 'difficulty', value: this.getGetDifificultyModifier(action.movement.modifiers.difficulty!) });
      modifiers.push({ key: 'armor-penalty', value: character.equipment.maneuverPenalty });
      modifiers.push({ key: 'custom-bonus', value: action.movement.modifiers.customBonus || 0 });
      modifiers.push({ key: 'hp-penalty', value: this.getHpPenalty(actorRound) });
      modifiers.push({ key: 'roll', value: character.equipment.maneuverPenalty });
      action.movement.roll = {
        rollModifiers: modifiers,
        roll: roll,
        totalRoll: modifiers.reduce((sum, mod) => sum + mod.value, 0),
      };
      //TODO
      percent = 50;
    }
    const bmr = character.movement.baseMovementRate;
    const paceMultiplier = this.getPaceMultiplier(action.movement.modifiers.pace);
    action.movement.calculated = {
      bmr: bmr,
      paceMultiplier: paceMultiplier,
      percent: percent,
      distance: bmr * percent * action.actionPoints * paceMultiplier,
      critical: undefined,
      description: 'Successful movement',
    };
  }

  private getHpPenalty(actorRound: ActorRound): number {
    //TODO
    return 0;
  }

  private getPaceMultiplier(pace: string): number {
    return 1;
  }

  private getGetDifificultyModifier(difficulty: string): number {
    switch (difficulty) {
      case 'c':
        return 70;
      case 's':
        return 50;
      case 'r':
        return -30;
      case 'e':
        return 20;
      case 'l':
        return 10;
      case 'm':
        return 0;
      case 'h':
        return -10;
      case 'vh':
        return -20;
      case 'xh':
        return -30;
      case 'sf':
        return -50;
      case 'a':
        return -70;
      case 'ni':
        return -100;
      default:
        throw new Error(`Unknown difficulty: ${difficulty}`);
    }
  }
}
