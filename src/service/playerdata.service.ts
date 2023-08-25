import { playerValueHistoryItemFromApiResponse } from "../helpers/player-value-history-item-from-api-response";
import { authService } from "./auth.service";

export interface PlayerValueHistoryItem {
  day: Date;
  value: number;
}

export class PlayerStatsService {
  public async getData(
    playerId: string,
    leagueId: string
  ): Promise<PlayerValueHistoryItem[]> {
    const url: string = `https://api.kickbase.com/leagues/${leagueId}/players/${playerId}/stats`;
    const response: Response | undefined = await fetch(
      url,
      authService.requestHeaders
    );
    const statsFromApi: any = await response?.json();

    return statsFromApi.marketValues.map(playerValueHistoryItemFromApiResponse);
  }
}

export const playerStatsService = new PlayerStatsService();
