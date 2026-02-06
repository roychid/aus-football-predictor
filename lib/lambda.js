import { formFactor } from "./form.js";
import { injuryFactor } from "./injuries.js";
import { tacticsFactor } from "./tactics.js";

export function computeLambda(base, team) {
  return (
    base *
    formFactor(team.pointsLast5) *
    injuryFactor(team.injuries) *
    tacticsFactor(team.tactics)
  );
}
