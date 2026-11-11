export type AttackLocation = 'head' | 'chest' | 'abdomen' | 'arms' | 'legs';

export const ATTACK_LOCATIONS: AttackLocation[] = ['head', 'chest', 'abdomen', 'arms', 'legs'];

/** A location of the critical tables (limbs in singular) as an attack location; undefined for any other value. */
export const toAttackLocation = (location: string | null | undefined): AttackLocation | undefined => {
  const value = location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  return ATTACK_LOCATIONS.find(candidate => candidate === value);
};
