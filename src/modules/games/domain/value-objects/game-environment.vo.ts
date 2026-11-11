import type { LightType } from '../../../actions/domain/value-objects/light-type.vo.js';
import type { FogLevel } from '../../../actions/domain/value-objects/fog-level.vo.js';
import {
  resolveExtremeTemperature,
  type ResolvedExtremeTemperature,
  type TemperatureKind,
} from '../../../actor-rounds/domain/services/environment-rules.js';

/**
 * Workspace spec 079, C3 (§15.3): the game takes place in an extreme temperature. Every upkeep raises its critical for
 * each actor the game master did not mark protected. A temperature (°C) goes through Table 15-3; a severity wins.
 */
export interface GameExtremeTemperature {
  kind: TemperatureKind;
  temperature: number | null;
  severity: string | null;
}

export class GameEnvironment {
  constructor(
    public readonly temperatureFatigueModifier: number | undefined,
    public readonly altitudeFatigueModifier: number | undefined,
    /**
     * Ambient light of the tactical game (workspace spec 076, P6): the default light of the maneuvers and movements,
     * and the light Light Sensitivity reads in combat. Null or missing: none.
     */
    public readonly light?: LightType | null,
    /** Fog of the game (workspace spec 079, C5): visual Perception and Tracking take its modifier. Null or missing: none. */
    public readonly fog?: FogLevel | null,
    /** Extreme temperature of the game (workspace spec 079, C3). Null or missing: none. */
    public readonly extremeTemperature?: GameExtremeTemperature | null,
  ) {}

  /**
   * The environment of a PATCH: the fatigue modifiers are replaced; a light, fog or extreme temperature left out keeps
   * the current one, and null clears it.
   */
  static merge(current: GameEnvironment | undefined, update: GameEnvironment): GameEnvironment {
    const keep = <T>(value: T | undefined, previous: T | undefined): T | undefined => (value !== undefined ? value : previous);
    return new GameEnvironment(
      update.temperatureFatigueModifier,
      update.altitudeFatigueModifier,
      keep(update.light, current?.light) ?? undefined,
      keep(update.fog, current?.fog) ?? undefined,
      keep(update.extremeTemperature, current?.extremeTemperature) ?? undefined,
    );
  }

  /** The critical the extreme temperature gives each round; null without one. Validation errors of Table 15-3. */
  static resolveTemperature(environment: GameEnvironment | undefined): ResolvedExtremeTemperature | null {
    const extreme = environment?.extremeTemperature;
    return extreme ? resolveExtremeTemperature(extreme) : null;
  }
}
