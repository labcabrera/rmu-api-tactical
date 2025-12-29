import { Injectable } from '@nestjs/common';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { Character } from '../../../strategic/application/ports/character.port';
import { Action } from '../../domain/aggregates/action.aggregate';
import { LightType } from '../../domain/value-objects/light-type.vo';
import { DifficultyService } from './difficulty-service';

@Injectable()
export class AbsoluteManeuverProcessorService {
  private static readonly lightMap: Map<LightType, number> = new Map([
    ['no_shadows', 0],
    ['light_shadows', -5],
    ['medium_shadows', -10],
    ['heavy_shadows', -15],
    ['dark', -25],
    ['extremely_dark', -35],
    ['pitch_black', -50],
  ]);

  constructor(private readonly difficultyService: DifficultyService) {}

  applyModifiers(action: Action, character: Character, actorRound: ActorRound, roll: number): void {
    if (!action.maneuver || !action.maneuver.modifiers) {
      return;
    }
    action.maneuver.roll = {
      modifiers: [],
      roll: roll,
    };
    action.maneuver.roll.modifiers.push({ key: 'roll', value: roll });
    this.applySkillModifier(action, character);
    this.applyDifficultyModifier(action);
    this.applyActorRoundPenalties(action, actorRound);
    this.applyArmorPenaltyModifier(action);
    this.applyLightModifier(action);
    this.applyActionPointsModifier(action);
    const totalRoll = action.maneuver.roll.modifiers.reduce((acc, mod) => acc + mod.value, 0);
    action.maneuver.roll.totalRoll = totalRoll;
  }

  private applySkillModifier(action: Action, character: Character): void {
    const skillId = action.maneuver!.modifiers.skillId;
    const skill = character.skills.find((s) => s.skillId === skillId);
    if (skill) {
      action.maneuver!.roll!.modifiers.push({ key: skillId, value: skill.totalBonus });
    } else {
      action.maneuver!.roll!.modifiers.push({ key: skillId, value: -25 });
    }
  }

  private applyArmorPenaltyModifier(action: Action): void {
    if (action.maneuver?.modifiers.armorModifier) {
      //TODO read
      action.maneuver.roll!.modifiers.push({ key: 'armorPenalty', value: -10 });
    }
  }

  private applyLightModifier(action: Action): void {
    if (
      !action.maneuver?.modifiers.light ||
      !action.maneuver?.modifiers.lightModifier ||
      action.maneuver.modifiers.lightModifier == 'none'
    ) {
      return;
    }
    const modifier = AbsoluteManeuverProcessorService.lightMap.get(action.maneuver.modifiers.light)!;
    const adjustedModifier = action.maneuver.modifiers.lightModifier === 'required' ? modifier * 2 : modifier;
    action.maneuver.roll!.modifiers.push({ key: 'light', value: adjustedModifier });
  }

  private applyDifficultyModifier(action: Action): void {
    const difficulty = action.maneuver!.modifiers.difficulty!;
    const modifier = this.difficultyService.getDifficultyModifier(difficulty);
    action.maneuver!.roll!.modifiers.push({ key: 'difficulty', value: modifier });
  }

  private applyActionPointsModifier(action: Action): void {
    this.applyPerceptionActionPointsModifier(action);
  }

  private applyActorRoundPenalties(action: Action, actorRound: ActorRound): void {
    actorRound.penalties.forEach((penalty) => {
      action.maneuver!.roll!.modifiers.push({ key: penalty.key, value: penalty.value });
    });
  }

  private applyPerceptionActionPointsModifier(action: Action): void {
    if (action.maneuver!.modifiers.skillId !== 'perception') {
      return;
    } else if (action.actionPoints == 0) {
      action.maneuver!.roll!.modifiers.push({ key: 'action-points', value: -50 });
    } else if (action.actionPoints == 1) {
      action.maneuver!.roll!.modifiers.push({ key: 'action-points', value: -25 });
    }
  }
}
