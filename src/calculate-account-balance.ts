import { NumberRange, UserBalanceData } from ".";
import { calculateStartingTeamValue } from "./calculate-starting-team-value";
import { User, leagueService } from "./service/league.service";

export async function calculateAccountBalance(
  user: User,
  leagueId: string
): Promise<UserBalanceData> {
  const [leagueUserTransfersResult, originalLineup] = await Promise.all([
    leagueService.getTransferBalance(leagueId, user.userId),
    leagueService.getOriginalLineup(leagueId, user.userId),
  ]);

  const startingTeamValue = await calculateStartingTeamValue(
    leagueId,
    user.userId,
    originalLineup ?? []
  );

  const daysSinceLeagueStarted =
    (new Date().getTime() - new Date("2024-07-01").getTime()) /
    (1000 * 60 * 60 * 24);
  const maxDiffCausedByDailyBonus = 100_000 * daysSinceLeagueStarted;

  // When a user joins they get a random team worth roughly 100M.
  // The starting account balance is 150M - the value of the randomly assigned starting team.
  const startingBalance = 150000000 - startingTeamValue;
  const currentBalanceMin =
    startingBalance + (leagueUserTransfersResult ?? 0) + user.points * 1000;
  const currentBalance: NumberRange = {
    min: currentBalanceMin,
    max: currentBalanceMin + maxDiffCausedByDailyBonus,
  };

  const teamValue = await leagueService.getTeamValue(leagueId, user.userId);

  const maxBid: NumberRange = {
    min: (teamValue + currentBalance.min) * 0.33 + currentBalance.min,
    max: (teamValue + currentBalance.max) * 0.33 + currentBalance.max,
  };
  return { username: user.userName, currentBalance, teamValue, maxBid };
}
