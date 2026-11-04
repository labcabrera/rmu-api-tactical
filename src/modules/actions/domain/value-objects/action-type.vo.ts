export type ActionType =
  | 'melee_attack'
  | 'ranged_attack'
  | 'maneuver'
  | 'movement'
  | 'stand_up'
  | 'dodge'
  | 'draw_and_load'
  | 'cast_spell'
  | 'medical'
  | 'use_item'
  /** Sharpshooter (workspace spec 076, decision B6): a full round aiming a ranged weapon at a foe. */
  | 'aim'
  | 'other';

export const ACTION_TYPES: ActionType[] = [
  'melee_attack',
  'ranged_attack',
  'maneuver',
  'movement',
  'stand_up',
  'dodge',
  'draw_and_load',
  'cast_spell',
  'medical',
  'use_item',
  'aim',
  'other',
];

/** Actions resolved by completing them (with an optional note), without rolls: see CompleteActionHandler. */
export const SIMPLE_ACTION_TYPES: ActionType[] = ['stand_up', 'dodge', 'draw_and_load', 'aim', 'other'];
