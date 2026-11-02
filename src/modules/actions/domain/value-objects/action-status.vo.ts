/**
 * Status of an action. Besides the resolution steps, an action can end `interrupted` (another action replaced it),
 * `expired` (the round ended without open rounds), `carried` (it goes on as a continuation in the next round) or be
 * `held` by the game master until it is triggered (spec 011, §5).
 */
export type ActionStatus =
  'declared' | 'prepared' | 'parry' | 'pending_roll' | 'pending_apply' | 'completed' | 'interrupted' | 'expired' | 'carried' | 'held';

export const ACTION_STATUSES: ActionStatus[] = [
  'declared',
  'prepared',
  'parry',
  'pending_roll',
  'pending_apply',
  'completed',
  'interrupted',
  'expired',
  'carried',
  'held',
];

/** Statuses of an action that is over in its round. */
export const CLOSED_ACTION_STATUSES: ActionStatus[] = ['completed', 'interrupted', 'expired', 'carried'];

/** Statuses of an action with resolution steps under way. */
export const IN_RESOLUTION_ACTION_STATUSES: ActionStatus[] = ['prepared', 'parry', 'pending_roll', 'pending_apply'];
