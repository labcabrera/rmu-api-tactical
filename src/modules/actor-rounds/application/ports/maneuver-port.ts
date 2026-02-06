export interface ManeuverPort {
  enduranceManeuver(roll: number): Promise<EnduranceManeuverResult>;
}

export interface EnduranceManeuverResult {
  result: 'success' | 'failure';
  message: string;
  fatigue: number;
  hitPoints: number;
  bonus: number;
}
