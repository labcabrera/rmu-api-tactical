/**
 * `critical` is the legacy source of the critical penalties, read as injuries since spec 013. `fatigue-critical`: the
 * temporary fatigue of the criticals, outside the -50 cap of the fatigue (workspace spec 077, decision D8).
 * `fortitude`: the part of the fatigue, hit loss, injury and stun penalties a Fortitude maneuver takes off, positive
 * (workspace spec 079, decision B4).
 */
export type ActorRoundPenaltySource =
  'critical' | 'injury' | 'endurance' | 'stunned' | 'hp' | 'non-violent' | 'fatigue' | 'fatigue-critical' | 'grappled' | 'fortitude';
