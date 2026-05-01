export type Difficulty = 'c' | 's' | 'r' | 'e' | 'l' | 'm' | 'h' | 'vh' | 'xh' | 'sf' | 'a' | 'ni';

export const DIFFICULTY_MAP: Map<Difficulty, number> = new Map([
  ['c', 70],
  ['s', 50],
  ['r', 30],
  ['e', 20],
  ['l', 10],
  ['m', 0],
  ['h', -10],
  ['vh', -20],
  ['xh', -30],
  ['sf', -50],
  ['a', -70],
  ['ni', -100],
]);
