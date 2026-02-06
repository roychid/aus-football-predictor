export function formFactor(pointsLast5) {
  const ratio = pointsLast5 / 15;
  return 0.9 + ratio * 0.2;
}
