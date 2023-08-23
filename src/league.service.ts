import { authService } from './auth.service';

export interface User {
	readonly points: number;
	readonly userId: string;
	readonly userName: string;
	readonly email: string;
}

export class LeagueService {
	public async getUsers(leagueId: string = ''): Promise<User[]> {
		let response: Response;
		try {
			response = await fetch(`https://api.kickbase.com/leagues/${leagueId}/users`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'cookie': authService.authCookie,
				},
			});
		} catch (e) {
			return [];
		}

		if (response.status !== 200) return [];
		const responseJson = (await response.json()) as any;

		return responseJson.users.map((user: { pt: any; id: any; name: any; email: any }) => ({
			points: user.pt,
			userId: user.id,
			userName: user.name,
			email: user.email,
		}));
	}

	public async getLeagueUserStats(leagueId: string, userId: string) {
		let response: Response;
		try {
			response = await fetch(`https://api.kickbase.com/leagues/${leagueId}/users/${userId}/stats`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'cookie': authService.authCookie,
				},
			});
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
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'cookie': authService.authCookie,
					},
				}
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
	public async getTransferBalance(leagueId: string, userId: string): Promise<number | undefined> {
		return (await this.getAllTransfers(leagueId, userId))
			.filter((item: any) => item.type === 12 || item.type === 2)
			.map((item: any) => {
				if (item.type === 12) {
					// user bought a player
					return -item.meta.p;
				} else if (item.type === 2) {
					// user sold a player
					return item.meta.p;
				}
				return 0;
			})
			.reduce((a: number, b: number) => a + b, 0);
	}

	public async getOriginalLineup(
		leagueId: string,
		userId: string
	): Promise<
		| {
				playerId: string;
				firstName: string;
				lastName: string;
		  }[]
		| undefined
	> {
		let playerResponse: Response;
		try {
			playerResponse = await fetch(
				`https://api.kickbase.com/leagues/${leagueId}/users/${userId}/players`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'cookie': authService.authCookie,
					},
				}
			);
		} catch (e) {
			return;
		}
		const players = ((await playerResponse.json()) as { players: any[] }).players.map(
			(player: any) => {
				return {
					playerId: player.id,
					playerFirstName: player.firstName,
					playerLastName: player.lastName,
				};
			}
		);

		// return responseJson.items;
		const allTransfers = (await this.getAllTransfers(leagueId, userId))
			.filter((item: any) => item.type === 12 || item.type === 2)
			.map((item: any) => {
				if (item.type === 12) {
					// user bought a player
					return {
						type: 'bought',
						playerId: item.meta.pid,
						price: -item.meta.p,
						playerFirstName: item.meta.pfn,
						playerLastName: item.meta.pln,
					} as const;
				} else if (item.type === 2) {
					// user sold a player
					return {
						type: 'sold',
						playerId: item.meta.pid,
						price: item.meta.p,
						playerFirstName: item.meta.pfn,
						playerLastName: item.meta.pln,
					} as const;
				}
			});

		const playersInTeamThatWereNeverBought = players.filter(player => {
			return !allTransfers.some(
				transfer =>
					transfer !== undefined &&
					transfer.playerId === player.playerId &&
					transfer.type === 'bought'
			);
		});

		const playersNotInTeamThatWereSold = allTransfers.filter(transfer => {
			const playerNotInTeam = !players.some(player => player.playerId === transfer?.playerId);
			const playerWasNeverBought = !allTransfers.some(
				transferedPlayer =>
					transferedPlayer?.playerId === transfer?.playerId && transferedPlayer?.type === 'bought'
			);
			const playerWasSold = transfer?.type === 'sold';
			return playerNotInTeam && playerWasNeverBought && playerWasSold;
		});

		const result = [...playersInTeamThatWereNeverBought, ...playersNotInTeamThatWereSold].map(
			player => {
				return {
					playerId: player?.playerId,
					firstName: player?.playerFirstName,
					lastName: player?.playerLastName,
				};
			}
		);
		return result;
	}

	private async getAllTransfers(leagueId: string, userId: string) {
		let response: Response;
		let startIdx: number = 0;
		const tryFetch = async () => {
			try {
				response = await fetch(
					`https://api.kickbase.com/leagues/${leagueId}/users/${userId}/feed?filter=12%2C2&start=${startIdx}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
							'cookie': authService.authCookie,
						},
					}
				);
			} catch (e) {
				return [];
			}
			if (response.status !== 200) return [];
			try {
				const responseJson = (await response.json()) as any;
				return responseJson.items;
			} catch (e) {
				return [];
			}
		};

		let allTransfers: any[] = [];

		while (true) {
			const transfers = await tryFetch();
			if (transfers.length === 0) break;
			allTransfers = allTransfers.concat(transfers);
			startIdx += transfers.length;
		}

		return allTransfers;
	}

	public async getTeamValue(leagueId: string, userId: string) {
		let playerResponse: Response;
		try {
			playerResponse = await fetch(
				`https://api.kickbase.com/leagues/${leagueId}/users/${userId}/players`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'cookie': authService.authCookie,
					},
				}
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
