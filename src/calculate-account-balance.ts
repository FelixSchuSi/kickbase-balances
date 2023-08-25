import { UserBalanceData } from ".";
import { calculateStartingTeamValue } from "./calculate-starting-team-value";
import { leagueService } from "./service/league.service";

export async function calculateAccountBalance(
  userId: string,
  leagueId: string,
  username: string
): Promise<UserBalanceData> {
  const [leagueUserTransfersResult, originalLineup] = await Promise.all([
    leagueService.getTransferBalance(leagueId, userId),
    leagueService.getOriginalLineup(leagueId, userId),
  ]);

  const startingTeamValue = await calculateStartingTeamValue(
    leagueId,
    userId,
    originalLineup ?? []
  );

  // When a user joins they get a random team worth roughly 100M.
  // The starting account balance is 150M - the value of the randomly assigned starting team.
  const startingBalance = 150000000 - startingTeamValue;
  const currentBalance = startingBalance + (leagueUserTransfersResult ?? 0);

  const teamValue = await leagueService.getTeamValue(leagueId, userId);
  const maxBid = (teamValue + currentBalance) * 0.33 + currentBalance;
  return { username, currentBalance, teamValue, maxBid };
}
