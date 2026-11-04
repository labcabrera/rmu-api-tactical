import type { LightType } from '../../../actions/domain/value-objects/light-type.vo.js';

export class GameEnvironment {
  constructor(
    public readonly temperatureFatigueModifier: number | undefined,
    public readonly altitudeFatigueModifier: number | undefined,
    /**
     * Ambient light of the tactical game (workspace spec 076, P6): the default light of the maneuvers and movements,
     * and the light Light Sensitivity reads in combat. Null or missing: none.
     */
    public readonly light?: LightType | null,
  ) {}

  /** The environment of a PATCH: a light left out keeps the current one, null clears it. */
  static merge(current: GameEnvironment | undefined, update: GameEnvironment): GameEnvironment {
    const light = update.light !== undefined ? update.light : current?.light;
    return new GameEnvironment(update.temperatureFatigueModifier, update.altitudeFatigueModifier, light ?? undefined);
  }
}
