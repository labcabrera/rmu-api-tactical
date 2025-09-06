export interface ActorRound {
  id: string;
  gameId: string;
  actorId: string;
  actorName: string;
  round: number;
  initiative: ActorRoundInitiative;
  actionPoints: number;
  hp: ActorRoundHP;
  fatigue: ActorRoundFatigue;
  penalties: ActorRoundPenalty[];
  attacks: ActorRoundAttack[];
  parries: ActorRoundParry[];
  effects: ActorRoundEffect[];
  owner: string;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface ActorRoundFatigue {
  endurance: number;
  fatigue: number;
  accumulator: number;
}

export interface ActorRoundHP {
  max: number;
  current: number;
}

export interface ActorRoundPenalty {
  key: number;
  value: number;
}

export interface ActorRoundEffect {
  status: string;
  value: number | undefined;
  rounds: number | undefined;
}

export interface ActorRoundAttack {
  attackName: string;
  boModifiers: BoModifiers[];
  /** Base attack without modifiers readed from character */
  baseBo: number;
  /** Current attack less parry amount and penalties applied */
  currentBo: number;
  attackType: 'melee' | 'ranged';
  fumbleTable: string;
  attackTable: string;
  fumble: number;
  canThrow: boolean;
}

export interface BoModifiers {
  key: string;
  subKey?: string;
  value: number;
}

export interface ActorRoundParry {
  attackName: string;
  parryValue: number;
}

export interface ActorRoundInitiative {
  base: number;
  penalty: number;
  roll: number | undefined;
  total: number | undefined;
}
