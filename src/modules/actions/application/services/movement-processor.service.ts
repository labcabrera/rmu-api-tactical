import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors/errors';
import { type CharacterPort, CHARACTER_PORT } from '../../../strategic/application/ports/character.port';
import { Action } from '../../domain/aggregates/action';
import { DIFFICULTY_MAP } from '../../domain/value-objects/difficulty.vo';
import { KeyValueModifier } from '../../domain/value-objects/key-value-modifier.vo';
import { LIGHT_MAP } from '../../domain/value-objects/light-type.vo';
import { MOVEMENT_MANEUVER_PROFILE } from '../../domain/value-objects/maneuver-profile.vo';
import { type ManeuverPort, MANEUVER_PORT } from '../ports/maneuver.port';
import { ManeuverBaseModifiersService } from './maneuver/maneuver-base-modifiers.service';

@Injectable()
export class MovementProcessorService {
  private static readonly paceMap: Map<string, number> = new Map([
    ['creep', 0.125],
    ['walk', 0.25],
    ['jog', 0.5],
    ['run', 0.75],
    ['sprint', 1],
    // Table 5-3: a dash covers 1.25 × BMR per phase.
    ['dash', 1.25],
  ]);

  /** Paces from slowest to fastest, to check the actor's maximum pace. */
  private static readonly paceOrder: string[] = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

  constructor(
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
    @Inject(CHARACTER_PORT) private readonly characterClient: CharacterPort,
    private readonly baseModifiersService: ManeuverBaseModifiersService,
  ) {}

  /**
   * `actionPoints`: AP the distance is covered in, the action's when left out (an instantaneous movement alongside
   * another action takes no AP of its own but still covers the phases it spans).
   */
  async process(roll: number | null, action: Action, actorRound: ActorRound, actionPoints = action.actionPoints): Promise<void> {
    if (!action.movement || !action.movement.modifiers) {
      throw new Error('Action does not have movement data');
    } else if (!actionPoints) {
      throw new Error('Action does not have action points data');
    }
    this.checkMaxPace(action.movement.modifiers.pace, actorRound.movement.maxPace);
    let percent = 100;
    let critical: string | null = null;
    let message: string | null = null;
    if (action.movement.modifiers.requiredManeuver) {
      if (roll === null || roll === undefined) {
        throw new ValidationError('Roll is required for movement with requiredManeuver');
      }
      const skillId = action.movement.modifiers.skillId || 'running';
      const character = await this.characterClient.findById(actorRound.actorId);
      if (!character) throw new NotFoundError('Character', actorRound.actorId);
      // The movement roll takes the base modifiers of any maneuver needing freedom of movement, but not the pace
      // penalty (§5.3), nor the AP one: its AP give the distance.
      const { skill, base } = this.baseModifiersService.compute({
        actorRound,
        character,
        profile: MOVEMENT_MANEUVER_PROFILE,
        skillId,
        specialization: null,
        actionPoints: null,
        pace: null,
        includePace: false,
      });

      const difficultyBonus = DIFFICULTY_MAP.get(action.movement.modifiers.difficulty!);
      if (difficultyBonus === undefined) {
        throw new ValidationError(`Unknown difficulty: ${action.movement.modifiers.difficulty}`);
      }
      const modifiers: KeyValueModifier[] = [
        new KeyValueModifier(skillId, skill.bonus),
        new KeyValueModifier('difficulty', difficultyBonus),
        ...base.map(modifier => new KeyValueModifier(modifier.key, modifier.value)),
        ...this.lightModifier(action.movement.modifiers.light),
        new KeyValueModifier('custom-bonus', action.movement.modifiers.customBonus || 0),
        new KeyValueModifier('roll', roll),
      ];
      const totalRoll = modifiers.reduce((acc, mod) => acc + mod.value, 0);
      action.movement.roll = {
        // modifiers: modifiers.filter((mod) => mod.value !== 0),
        modifiers: modifiers,
        roll: roll,
        totalRoll: totalRoll,
      };
      const maneuverResult = await this.maneuverPort.percent(action.movement.roll.totalRoll!);
      percent = maneuverResult.percent;
      critical = maneuverResult.critical ?? null;
      message = maneuverResult.message;
    }
    const bmr = actorRound.movement.bmr;
    const paceMultiplier = this.getPaceMultiplier(action.movement.modifiers.pace);
    const distance = (bmr * percent * actionPoints * paceMultiplier) / 100;
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

  /** Table 5-1: light helps movement maneuvers (the helpful column). */
  private lightModifier(light: string | null | undefined): KeyValueModifier[] {
    if (!light) return [];
    const value = LIGHT_MAP.get(light as never);
    if (value === undefined) {
      throw new ValidationError(`Unknown light: ${light}`, 'err-maneuver-invalid-modifier');
    }
    return value === 0 ? [] : [new KeyValueModifier('light', value)];
  }

  /** Table 5-3: the encumbrance or the creature caps the pace. An unknown maximum (older actor rounds) is not checked. */
  private checkMaxPace(pace: string, maxPace: string | undefined): void {
    const max = MovementProcessorService.paceOrder.indexOf(maxPace || '');
    if (max >= 0 && MovementProcessorService.paceOrder.indexOf(pace) > max) {
      throw new ValidationError(`Pace ${pace} is above the actor's maximum pace ${maxPace}`, 'err-pace-above-max');
    }
  }

  private getPaceMultiplier(pace: string): number {
    const value = MovementProcessorService.paceMap.get(pace);
    if (value === undefined) {
      throw new ValidationError(`Unknown pace: ${pace}`);
    }
    return value;
  }
}
