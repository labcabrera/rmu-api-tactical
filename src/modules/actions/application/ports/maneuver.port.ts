export interface ManeuverPort {
  percent(roll: number): Promise<PercentManeuverResponse>;

  absolute(roll: number): Promise<AbsoluteManeuverResponse>;
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
