export function tacticsFactor(style) {
  if (style === "attacking") return 1.05;
  if (style === "defensive") return 0.95;
  return 1.0;
}
