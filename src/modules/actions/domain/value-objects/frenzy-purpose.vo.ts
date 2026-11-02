/** What an Adrenal Focus maneuver is for (workspace spec 040, decision 8): entering frenzy, greater frenzy, or leaving it. */
export type FrenzyPurpose = 'frenzy-enter' | 'frenzy-enter-greater' | 'frenzy-exit';

export const FRENZY_PURPOSES: FrenzyPurpose[] = ['frenzy-enter', 'frenzy-enter-greater', 'frenzy-exit'];
