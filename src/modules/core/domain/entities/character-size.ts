export interface CharacterSize {
  id: string;
  index: number;
  name: string;
  hitMultiplier: number;
}

export const CHARACTER_SIZES: CharacterSize[] = [
  { id: 'minuscule', index: 1, name: 'Minuscule', hitMultiplier: 0.25 },
  { id: 'diminutive', index: 2, name: 'Diminutive', hitMultiplier: 0.5 },
  { id: 'tiny', index: 3, name: 'Tiny', hitMultiplier: 0.67 },
  { id: 'small', index: 4, name: 'Small', hitMultiplier: 0.75 },
  { id: 'medium', index: 5, name: 'Medium', hitMultiplier: 1.0 },
  { id: 'big', index: 6, name: 'Big', hitMultiplier: 1.5 },
  { id: 'large', index: 7, name: 'Large', hitMultiplier: 2.0 },
  { id: 'huge', index: 8, name: 'Huge', hitMultiplier: 3.0 },
  { id: 'gigantic', index: 9, name: 'Gigantic', hitMultiplier: 4.0 },
  { id: 'enormous', index: 10, name: 'Enormous', hitMultiplier: 5.0 },
];
