import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { ValidationError } from '../../../shared/domain/errors';
import { Action } from '../../domain/aggregates/action.aggregate';
import { DIFFICULTY_MAP } from '../../domain/value-objects/dificulty.vo';
import { KeyValueModifier } from '../../domain/value-objects/key-value-modifier.vo';
import type { ManeuverPort } from '../ports/maneuver.port';
import { SkillService } from './skill-service';

@Injectable()
export class MovementProcessorService {
  private static readonly paceMap: Map<string, number> = new Map([
    ['creep', 0.125],
    ['walk', 0.25],
    ['jog', 0.5],
    ['run', 0.75],
    ['sprint', 1],
    ['dash', 1],
  ]);

  constructor(
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
    @Inject() private readonly skillService: SkillService,
  ) {}

  async process(roll: number | null, action: Action, actorRound: ActorRound): Promise<void> {
    if (!action.movement || !action.movement.modifiers) {
      throw new Error('Action does not have movement data');
    } else if (!action.actionPoints) {
      throw new Error('Action does not have action points data');
    }
    let percent = 100;
    let critical: string | null = null;
    let message: string | null = null;
    if (action.movement.modifiers.requiredManeuver) {
      if (!roll) {
        throw new Error('Roll is required for movement with requiredManeuver');
      }
      const skillId = action.movement.modifiers.skillId || 'running';
      const skillBonus = await this.skillService.getSkillBonus(actorRound, skillId, null);

      const modifiers: KeyValueModifier[] = [];
      const difficultyBonus = DIFFICULTY_MAP.get(action.movement.modifiers.difficulty!)!;
      if (!difficultyBonus) {
        throw new ValidationError(`Unknown difficulty: ${action.movement.modifiers.difficulty}`);
      }
      modifiers.push({ key: skillId, value: skillBonus });
      modifiers.push({ key: 'difficulty', value: difficultyBonus });
      modifiers.push({ key: 'movement-penalty', value: actorRound.movement.penalty || 0 });
      modifiers.push({ key: 'custom-bonus', value: action.movement.modifiers.customBonus || 0 });
      actorRound.penalty.modifiers.forEach(penalty => {
        //TODO check if penalty applies to movement from core law
        modifiers.push(new KeyValueModifier(penalty.source, penalty.value));
      });
      modifiers.push({ key: 'roll', value: roll });
      const totalRoll = modifiers.reduce((acc, mod) => acc + mod.value, 0);
      action.movement.roll = {
        // modifiers: modifiers.filter((mod) => mod.value !== 0),
        modifiers: modifiers,
        roll: roll,
        totalRoll: totalRoll,
      };
      const maneuverResult = await this.maneuverPort.percent(action.movement.roll.totalRoll!);
      percent = maneuverResult.percent;
      critical = maneuverResult.critical;
      message = maneuverResult.message;
    }
    const bmr = actorRound.movement.bmr;
    const paceMultiplier = this.getPaceMultiplier(action.movement.modifiers.pace);
    const distance = (bmr * percent * action.actionPoints * paceMultiplier) / 100;
    action.movement.calculated = {
      bmr: bmr,
      paceMultiplier: paceMultiplier,
      percent: percent,
      distance: distance,
      distanceAdjusted: distance,
      critical: critical,
      description: message || `Movement completed at ${percent}%`,
    };
  }

  private getPaceMultiplier(pace: string): number {
    const value = MovementProcessorService.paceMap.get(pace);
    if (value === undefined) {
      throw new ValidationError(`Unknown pace: ${pace}`);
    }
    return value;
  }
}
