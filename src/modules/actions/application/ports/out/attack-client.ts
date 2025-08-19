import {
  CoverType,
  DodgeType,
  PositionalSourceType,
  PositionalTargetType,
  RestrictedQuartersType,
} from '../../commands/prepare-attack.command';

export interface AttackClient {
  prepareAttack(actionId: AttackCreationRequest): Promise<AttackCreationResponse>;
}

export interface AttackRollModifiers {
  bo: number;
  bd: number;
  injuryPenalty: number;
  fatiguePenalty: number;
  rangePenalty: number | undefined;
  shield: number | undefined;
  parry: number | undefined;
  customBonus: number | undefined;
}

export interface AttackSituationalModifiers {
  cover: CoverType;
  restrictedQuarters: RestrictedQuartersType;
  positionalSource: PositionalSourceType;
  positionalTarget: PositionalTargetType;
  dodge: DodgeType;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  sizeDifference: number;
  offHand: boolean;
  twoHandedWeapon: boolean;
  sourceStatus: string[];
  targetStatus: string[];
}

export interface AttackFeature {
  key: string;
  value: string;
}

export interface AttackSourceSkill {
  skillId: string;
  bonus: number;
}

export interface AttackModifiers {
  attackType: string;
  attackTable: string;
  attackSize: string;
  fumbleTable: string;
  at: number;
  actionPoints: number;
  fumble: number;
  rollModifiers: AttackRollModifiers;
  situationalModifiers: AttackSituationalModifiers;
  features: AttackFeature[];
}

export interface AttackCreationRequest {
  actionId: string;
  sourceId: string;
  targetId: string;
  modifiers: AttackModifiers;
}

export interface AttackCreationResponse {
  //TODO
  id: string;
}
