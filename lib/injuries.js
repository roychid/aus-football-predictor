export function injuryFactor(count) {
  if (count === 0) return 1;
  if (count === 1) return 0.95;
  if (count === 2) return 0.9;
  return 0.85;
}
