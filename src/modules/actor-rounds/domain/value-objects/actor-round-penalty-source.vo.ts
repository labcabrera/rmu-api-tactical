/**
 * `critical` is the legacy source of the critical penalties, read as injuries since spec 013. `fatigue-critical`: the
 * temporary fatigue of the criticals, outside the -50 cap of the fatigue (workspace spec 077, decision D8).
 */
export type ActorRoundPenaltySource =
  'critical' | 'injury' | 'endurance' | 'stunned' | 'hp' | 'non-violent' | 'fatigue' | 'fatigue-critical' | 'grappled';
