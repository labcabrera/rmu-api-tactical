import type { ActionManeuverEffect } from '../../domain/value-objects/action-maneuver.vo';

export interface ManeuverPort {
  percent(roll: number): Promise<PercentManeuverResponse>;

  /** `table`: absolute maneuver table (`generic` when omitted). `unusualEvent`: unmodified 66. */
  absolute(roll: number, table?: string, unusualEvent?: boolean): Promise<AbsoluteManeuverResponse>;

  endurance(roll: number): Promise<EnduranceManeuverResult>;
}

export const MANEUVER_PORT = Symbol('ManeuverPort');

export interface EnduranceManeuverResult {
  result: string;
  message: string;
  /** Change of the fatigue penalty: positive adds fatigue, negative shakes it off. */
  fatigue: number;
  /** Hits taken. */
  hitPoints: number;
  /** Bonus to the action about to be performed. */
  bonus: number;
}

export interface PercentManeuverResponse {
  percent: number;
  critical: string | null | undefined;
  message: string;
}

export interface AbsoluteManeuverResponse {
  result: string;
  message: string;
  effects?: ActionManeuverEffect[];
}
