export type LightType = 'no_shadows' | 'light_shadows' | 'medium_shadows' | 'heavy_shadows' | 'dark' | 'extremely_dark' | 'pitch_black';

/** Table 5-1: light modifier of a maneuver where light is helpful. Where it is required, the value doubles. */
export const LIGHT_MAP: Map<LightType, number> = new Map([
  ['no_shadows', 0],
  ['light_shadows', -5],
  ['medium_shadows', -10],
  ['heavy_shadows', -15],
  ['dark', -25],
  ['extremely_dark', -35],
  ['pitch_black', -50],
]);
