export interface ManeuverPort {
  percent(roll: number): Promise<PercentManeuverResponse>;
}

export interface PercentManeuverResponse {
  percent: number;
  critical: string | undefined;
  message: string;
}
