import { authService } from './auth.service';
import {
	PlayerUpcomingMatch,
	playerUpcomingMatchFromApiResponse,
} from './player-upcoming-match-from-api-response';
import { playerValueHistoryItemFromApiResponse } from './player-value-history-item-from-api-response';

export enum MarketValueTrend {
	UP = 1,
	DOWN = 2,
}

export interface PlayerSeasonSummary {
	assists: number;
	defensiveAverage: number;
	defensivePoints: number;
	generalAverage: number;
	generalPoints: number;
	goalFree: number;
	goalKeeperAverage: number;
	goalKeeperPoints: number;
	goals: number;
	matches: number;
	offensiveAverage: number;
	offensivePoints: number;
	points: number;
	redCards: number;
	season: string;
	seasonId: string;
	secondsPerGoal: number;
	secondsPlayed: number;
	startMatches: number;
	teamAverage: number;
	teamPoints: number;
	yellowCards: number;
}

export interface PlayerValueHistoryItem {
	day: Date;
	value: number;
}

export enum PlayerPosition {
	GOAL_KEEPER = 1,
	DEFENDER = 2,
	MIDFIELDER = 3,
	FORWARD = 4,
	UNKNOWN = 9999999999,
}

export enum PlayerStatus {
	NONE = 0,
	INJURED = 1,
	STRICKEN = 2,
	REHAB = 4,
	RED_CARD = 8,
	YELLOW_RED_CARD = 16,
	FIFTH_YELLOW_CARD = 32,
	NOT_IN_TEAM = 64,
	NOT_IN_LEAGUE = 128,
	ABSENT = 256,
	UNKNOWN = 9999999999,
}

export interface PlayerStats {
	averagePoints: number;
	f: boolean; // TODO: What is this
	firstName: string;
	id: string;
	lastName: string;
	marketValue: number;
	marketValues?: PlayerValueHistoryItem[];
	mvHigh: number;
	mvHighDate: Date;
	mvLow: number;
	mvLowDate: Date;
	mvTrend: MarketValueTrend;
	// upcomingMatches: PlayerUpcomingMatch[];
	number: number;
	points: number;
	position: PlayerPosition;
	profileUrl: string;
	seasons: PlayerSeasonSummary[];
	status: PlayerStatus;
	teamCoverUrl: string;
	teamId: string; // TODO: Create ENUM with Team IDs
	teamUrl: string;
	userFlags: 0; // TODO: What is this?
}

export class PlayerStatsService {
	public async getData(playerId: string, leagueId: string): Promise<PlayerStats> {
		const url: string = `https://api.kickbase.com/leagues/${leagueId}/players/${playerId}/stats`;
		console.log('url: ', url);
		let response: Response | undefined;
		try {
			response = await fetch(url, authService.requestOptions);
		} catch (e) {
			console.log('e: ', e);
			console.log(`Error fetching player stats: ${e.message}`);
		}

		console.log('response: ', response);
		const statsFromApi: any = await response?.json();
		console.log('statsFromApi: ', statsFromApi);

		return {
			averagePoints: statsFromApi.averagePoints,
			f: statsFromApi.f,
			firstName: statsFromApi.firstName,
			id: statsFromApi.id,
			lastName: statsFromApi.lastName,
			marketValue: statsFromApi.marketValue,
			// TODO: visualize markeit values
			marketValues: statsFromApi.marketValues.map(playerValueHistoryItemFromApiResponse),
			mvHigh: statsFromApi.mvHigh,
			mvHighDate: new Date(statsFromApi.mvHighDate),
			mvLow: statsFromApi.mvLow,
			mvLowDate: new Date(statsFromApi.mvLowDate),
			mvTrend: statsFromApi.mvTrend,
			// upcomingMatches: statsFromApi.nm.map(playerUpcomingMatchFromApiResponse),
			number: statsFromApi.number,
			points: statsFromApi.points,
			position: statsFromApi.position,
			profileUrl: statsFromApi.profileUrl,
			seasons: statsFromApi.seasons,
			status: statsFromApi.status,
			teamCoverUrl: statsFromApi.teamCoverUrl,
			teamId: statsFromApi.teamId,
			teamUrl: statsFromApi.teamUrl,
			userFlags: statsFromApi.userFlags,
		};
	}
}

export const playerStatsService = new PlayerStatsService();
