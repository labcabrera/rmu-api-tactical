const D100 = 100;
const HIGH_FROM = 96;
const LOW_TO = 5;

const d100 = (random: () => number): number => Math.floor(random() * D100) + 1;

/**
 * An open-ended d100 (§5.1), for the rolls of a group check the client leaves to the server: 96-100 rolls again and
 * adds, 1-5 rolls again and subtracts, and so on while the new roll is 96-100.
 */
export const openEndedRoll = (random: () => number = Math.random): { roll: number; unmodified: number } => {
  const unmodified = d100(random);
  let total = unmodified;
  if (unmodified >= HIGH_FROM || unmodified <= LOW_TO) {
    const sign = unmodified >= HIGH_FROM ? 1 : -1;
    let next: number;
    do {
      next = d100(random);
      total += sign * next;
    } while (next >= HIGH_FROM);
  }
  return { roll: total, unmodified };
};
