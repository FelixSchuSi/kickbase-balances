export interface PlayerUpcomingMatch {
	day: Date;
	homeTeamId: string;
	homeTeamName: string;
	homeTeamNameShort: string;
	awayTeamId: string;
	awayTeamName: string;
	awayTeamNameShort: string;
	match: number;
	points: number;
	playtimeSeconds: number;
	homeTeamGoals: number;
	awayTeamGoals: number;
}

export function playerUpcomingMatchFromApiResponse(upcomingMatch: any): PlayerUpcomingMatch {
	return {
		day: new Date(upcomingMatch.d),
		homeTeamId: upcomingMatch.t1i,
		homeTeamName: upcomingMatch.t1n,
		homeTeamNameShort: upcomingMatch.t1y,
		awayTeamId: upcomingMatch.t2i,
		awayTeamName: upcomingMatch.t2n,
		awayTeamNameShort: upcomingMatch.t2y,
		match: upcomingMatch.md,
		points: 0,
		playtimeSeconds: 0,
		homeTeamGoals: -1,
		awayTeamGoals: -1,
	};
}
