export type ActionType =
  'melee_attack' | 'ranged_attack' | 'maneuver' | 'movement' | 'stand_up' | 'dodge' | 'draw_and_load' | 'cast_spell' | 'other';

/** Actions resolved by completing them (with an optional note), without rolls: see CompleteActionHandler. */
export const SIMPLE_ACTION_TYPES: ActionType[] = ['stand_up', 'dodge', 'draw_and_load', 'other'];
