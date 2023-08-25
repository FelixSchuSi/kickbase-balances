import { authService } from "./auth.service";

export interface User {
  readonly points: number;
  readonly userId: string;
  readonly userName: string;
  readonly email: string;
}

export interface LineupEntry {
  playerId: string;
  firstName: string;
  lastName: string;
}

export interface Transfer {
  type: "bought" | "sold" | "unknown";
  price: number;
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
}

const TRANSIENT_REQUEST_CACHE = new Map<string, any>();

export class LeagueService {
  public async getUsers(leagueId: string = ""): Promise<User[]> {
    let response: Response;
    try {
      response = await fetch(
        `https://api.kickbase.com/leagues/${leagueId}/users`,
        authService.requestHeaders
      );
    } catch (e) {
      return [];
    }

    if (response.status !== 200) return [];
    const responseJson = (await response.json()) as any;

    return responseJson.users.map(
      (user: { pt: any; id: any; name: any; email: any }) => ({
        points: user.pt,
        userId: user.id,
        userName: user.name,
        email: user.email,
      })
    );
  }

  public async getLeagueUserStats(leagueId: string, userId: string) {
    let response: Response;
    try {
      response = await fetch(
        `https://api.kickbase.com/leagues/${leagueId}/users/${userId}/stats`,
        authService.requestHeaders
      );
    } catch (e) {
      return;
    }

    if (response.status !== 200) return;
    const responseJson = (await response.json()) as any;

    return responseJson;
  }

  public async getLeagueUserProfile(leagueId: string, userId: string) {
    let response: Response;
    try {
      response = await fetch(
        `https://api.kickbase.com/leagues/${leagueId}/users/${userId}/profile`,
        authService.requestHeaders
      );
    } catch (e) {
      return;
    }

    if (response.status !== 200) return;
    const responseJson = (await response.json()) as any;

    return responseJson;
  }

  /**
   * Calculates how much total win/loss a player made with all of his past transfers
   * @param leagueId
   * @param userId
   * @returns transferbalance
   */
  public async getTransferBalance(
    leagueId: string,
    userId: string
  ): Promise<number | undefined> {
    return (await this.getAllTransfers(leagueId, userId))
      .map((item) => item.price)
      .reduce((a: number, b: number) => a + b, 0);
  }

  public async getOriginalLineup(
    leagueId: string,
    userId: string
  ): Promise<LineupEntry[] | undefined> {
    // The OG lineup of a user never changes, so we can cache it
    if (localStorage.getItem(`og-lineup-${userId}-${leagueId}`) !== null) {
      return JSON.parse(
        localStorage.getItem(`og-lineup-${userId}-${leagueId}`)!
      );
    }
    let playerResponse: Response;
    try {
      playerResponse = await fetch(
        `https://api.kickbase.com/leagues/${leagueId}/users/${userId}/players`,
        authService.requestHeaders
      );
    } catch (e) {
      return;
    }
    const players = (
      (await playerResponse.json()) as { players: any[] }
    ).players.map((player: any) => {
      return {
        playerId: player.id,
        playerFirstName: player.firstName,
        playerLastName: player.lastName,
      };
    });

    const allTransfers = await this.getAllTransfers(leagueId, userId);

    const playersInTeamThatWereNeverBought = players.filter((player) => {
      return !allTransfers.some(
        (transfer) =>
          transfer !== undefined &&
          transfer.playerId === player.playerId &&
          transfer.type === "bought"
      );
    });

    const playersNotInTeamThatWereSold = allTransfers.filter((transfer) => {
      const playerNotInTeam = !players.some(
        (player) => player.playerId === transfer?.playerId
      );
      const playerWasNeverBought = !allTransfers.some(
        (transferedPlayer) =>
          transferedPlayer?.playerId === transfer?.playerId &&
          transferedPlayer?.type === "bought"
      );
      const playerWasSold = transfer?.type === "sold";
      return playerNotInTeam && playerWasNeverBought && playerWasSold;
    });

    const result = [
      ...playersInTeamThatWereNeverBought,
      ...playersNotInTeamThatWereSold,
    ].map((player) => {
      return {
        playerId: player?.playerId,
        firstName: player?.playerFirstName,
        lastName: player?.playerLastName,
      };
    });

    localStorage.setItem(
      `og-lineup-${userId}-${leagueId}`,
      JSON.stringify(result)
    );
    return result;
  }

  private async getAllTransfers(
    leagueId: string,
    userId: string
  ): Promise<Transfer[]> {
    // Per page load we call this expensive function multiple times so we should cache the response.
    if (TRANSIENT_REQUEST_CACHE.has(`all-transfers-${userId}-${leagueId}`)) {
      return TRANSIENT_REQUEST_CACHE.get(`all-transfers-${userId}-${leagueId}`);
    }
    let response: Response;
    let startIdx: number = 0;
    async function tryFetch(): Promise<Transfer[]> {
      try {
        response = await fetch(
          `https://api.kickbase.com/leagues/${leagueId}/users/${userId}/feed?filter=12%2C2&start=${startIdx}`,
          authService.requestHeaders
        );
      } catch (e) {
        return [];
      }
      if (response.status !== 200) return [];
      try {
        const responseJson = (await response.json()) as any;
        return (responseJson.items as any[]).map((item) => {
          let type: "bought" | "sold" | "unknown";
          let price: number;

          if (item.type === 12) {
            type = "bought";
            price = -item.meta.p;
          } else if (item.type === 2) {
            type = "sold";
            price = item.meta.p;
          } else {
            type = "unknown";
            price = 0;
          }

          const res: Transfer = {
            type,
            price,
            playerId: item.meta.pid,
            playerFirstName: item.meta.pfn,
            playerLastName: item.meta.pln,
          };
          return res;
        });
      } catch (e) {
        return [];
      }
    }

    let allTransfers: Transfer[] = [];

    while (true) {
      const transfers = await tryFetch();
      if (transfers.length === 0) break;
      allTransfers = allTransfers.concat(transfers);
      startIdx += transfers.length;
    }

    // cache the result transiently
    TRANSIENT_REQUEST_CACHE.set(
      `all-transfers-${userId}-${leagueId}`,
      allTransfers
    );
    return allTransfers;
  }

  public async getTeamValue(leagueId: string, userId: string) {
    let playerResponse: Response;
    try {
      playerResponse = await fetch(
        `https://api.kickbase.com/leagues/${leagueId}/users/${userId}/players`,
        authService.requestHeaders
      );
    } catch (e) {
      return;
    }
    return ((await playerResponse.json()) as { players: any[] }).players
      .map((player: any) => {
        return player.marketValue;
      })
      .reduce((a, b) => a + b, 0);
  }
}

export const leagueService = new LeagueService();
