export interface ArmorType {
  id: number;
  name: string;
}

export const ARMOR_TYPES: ArmorType[] = [
  { id: 1, name: 'None' },
  { id: 2, name: 'Heavy Cloth' },
  { id: 3, name: 'Soft Leather' },
  { id: 4, name: 'Hide Scale' },
  { id: 5, name: 'Laminar' },
  { id: 6, name: 'Rigid Leather' },
  { id: 7, name: 'Metal Scale' },
  { id: 8, name: 'Mail' },
  { id: 9, name: 'Brigandine' },
  { id: 10, name: 'Plate' },
];
