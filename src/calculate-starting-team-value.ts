import { LineupEntry } from "./service/league.service";
import { playerStatsService } from "./service/playerdata.service";

/**
 * Calculates the market value of the original lineup as of 2023-08-07.
 * @param leagueId
 * @param userId
 * @param startingTeam
 * @returns
 */
export async function calculateStartingTeamValue(
  leagueId: string,
  userId: string,
  startingTeam: LineupEntry[]
): Promise<number> {
  // The starting team value never changes, so we can cache it
  if (
    localStorage.getItem(`startingTeamValue-${userId}-${leagueId}`) !== null
  ) {
    return Number(
      localStorage.getItem(`startingTeamValue-${userId}-${leagueId}`)
    );
  }

  const startingTeamPlayerValues: number[] = await Promise.all(
    startingTeam.map(async (player) =>
      playerStatsService
        .getData(player.playerId, leagueId)
        .then(
          (marketValues) =>
            marketValues?.find((e) =>
              e.day.toISOString().startsWith("2024-07-01")
            )?.value
        )
        .then((value) => value ?? 0)
    )
  );

  const result = startingTeamPlayerValues.reduce((a, b) => a + b, 0);
  // cache the result
  localStorage.setItem(
    `startingTeamValue-${userId}-${leagueId}`,
    result.toString()
  );
  return result;
}
