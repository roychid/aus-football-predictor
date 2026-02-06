import fs from "fs";
import path from "path";
import { AU_LEAGUES } from "../config/australiaLeagues.js";
import { poisson } from "../lib/poisson.js";
import { computeLambda } from "../lib/lambda.js";

// Safe JSON read at runtime
function readJSON(filename) {
  const filePath = path.resolve(`./data/${filename}`);
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return {}; // fallback empty
  }
}

// Helper: average last 5 goals
function avgGoals(matches, teamId, league, type) {
  const last5 = matches
    .filter(m => m.teamId == teamId && m.league === league)
    .slice(-5);

  if (!last5.length) return 1; // default if no data
  const sum = last5.reduce((a, m) => a + m[type], 0);
  return sum / last5.length;
}

// Helper: most likely score 0-4 goals
function predictedScore(lambdaHome, lambdaAway) {
  let maxProb = 0;
  let score = [0, 0];

  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const p = poisson(lambdaHome, h) * poisson(lambdaAway, a);
      if (p > maxProb) {
        maxProb = p;
        score = [h, a];
      }
    }
  }
  return `${score[0]}-${score[1]}`;
}

// Over 2.5 goals probability
function over2_5(lambdaHome, lambdaAway) {
  let prob = 0;
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      if (h + a > 2) prob += poisson(lambdaHome, h) * poisson(lambdaAway, a);
    }
  }
  return prob;
}

// Main handler
export default function handler(req, res) {
  const { homeId, awayId, league } = req.query;

  if (!homeId || !awayId || !league) {
    return res.status(400).json({ error: "Missing homeId, awayId, or league query parameter" });
  }

  if (!AU_LEAGUES[league]) {
    return res.status(400).json({ error: "Only Australian leagues are supported" });
  }

  // Read JSON safely
  const matches = readJSON("matches.json");
  const teams = readJSON("teams.json");

  const homeTeam = teams[homeId];
  const awayTeam = teams[awayId];

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: "Invalid homeId or awayId" });
  }

  const { leagueAvgGoals, homeAdvantage, name: leagueName } = AU_LEAGUES[league];

  const homeFor = avgGoals(matches, homeId, league, "goalsFor");
  const homeAgainst = avgGoals(matches, homeId, league, "goalsAgainst");
  const awayFor = avgGoals(matches, awayId, league, "goalsFor");
  const awayAgainst = avgGoals(matches, awayId, league, "goalsAgainst");

  const baseHome = (homeFor / leagueAvgGoals) * (awayAgainst / leagueAvgGoals) * leagueAvgGoals * homeAdvantage;
  const baseAway = (awayFor / leagueAvgGoals) * (homeAgainst / leagueAvgGoals) * leagueAvgGoals;

  const lambdaHome = computeLambda(baseHome, homeTeam);
  const lambdaAway = computeLambda(baseAway, awayTeam);

  // Win / Draw / Lose
  let homeWin = 0, draw = 0, awayWin = 0;
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const p = poisson(lambdaHome, h) * poisson(lambdaAway, a);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }

  // Return user-friendly JSON
  res.json({
    league: leagueName,
    teams: {
      home: { id: homeId, lambda: Number(lambdaHome.toFixed(2)) },
      away: { id: awayId, lambda: Number(lambdaAway.toFixed(2)) }
    },
    probabilities: {
      homeWin: Number(homeWin.toFixed(3)),
      draw: Number(draw.toFixed(3)),
      awayWin: Number(awayWin.toFixed(3))
    },
    predictedScore: predictedScore(lambdaHome, lambdaAway),
    over2_5Goals: Number(over2_5(lambdaHome, lambdaAway).toFixed(3))
  });
}
