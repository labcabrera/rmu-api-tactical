export interface ManeuverPort {
  percent(roll: number): Promise<PercentManeuverResponse>;

  absolute(roll: number): Promise<AbsoluteManeuverResponse>;

  endurance(roll: number): Promise<EnduranceManeuverResult>;
}

export interface EnduranceManeuverResult {
  result: 'success' | 'failure';
  message: string;
  fatigue: number;
  hitPoints: number;
  bonus: number;
}

export interface PercentManeuverResponse {
  percent: number;
  critical: string | undefined;
  message: string;
}

export interface AbsoluteManeuverResponse {
  result: string;
  message: string;
}
