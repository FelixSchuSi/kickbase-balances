import { authService } from './auth.service';
import { leagueService } from './league.service';
import { playerStatsService } from './playerdata.service';

interface Env {
	KB_EMAIL: string;
	KB_PASSWORD: string;
}

export default {
	async fetch(request: Request, env: Env) {
		const loginResult = await authService.login(env.KB_EMAIL, env.KB_PASSWORD);
		if (loginResult === undefined) return new Response('Login failed');
		const leagueId = loginResult.leagues.find(league => league.amd === true)?.id;
		if (leagueId === undefined) return new Response('No league found');
		const leaguePlayersResult = await leagueService.getUsers(leagueId);

		const result = (
			await Promise.allSettled(
				leaguePlayersResult.map(async user => {
					const leagueUserTransfersResult = await leagueService.getTransferBalance(
						leagueId,
						user.userId
					);

					const originalLineup = await leagueService.getOriginalLineup(leagueId, user.userId);
					if (originalLineup === undefined) return;
					// Calculate the market value of the original lineup as of 2023-08-07

					const ogLineup: PromiseSettledResult<number | undefined>[] = await Promise.allSettled(
						originalLineup.map(async player => {
							const playerData = await playerStatsService.getData(player.playerId, leagueId);
							console.log('playerData: ', JSON.stringify(playerData));
							return playerData.marketValues?.find(e =>
								e.day.toISOString().startsWith('2023-08-06')
							)?.value;
						})
					);
					const ogLineupValueAtStart = ogLineup
						.filter(e => e.status === 'fulfilled' && e.value !== undefined)
						.map(e => (e as PromiseFulfilledResult<number>).value)
						.reduce((a, b) => a + b, 0);

					const orLineupErr = ogLineup
						.filter(e => e.status === 'rejected')
						.map(e => (e as PromiseRejectedResult).reason);
					console.log(
						'lineupErr',
						orLineupErr.map(e => JSON.stringify(e))
					);

					const ogAccountBalance = 150000000 - ogLineupValueAtStart;
					const currentAccountBalance = ogAccountBalance + (leagueUserTransfersResult ?? 0);

					const teamValue = await leagueService.getTeamValue(leagueId, user.userId);
					const maxBid = (teamValue + currentAccountBalance) * 0.33 + currentAccountBalance;
					console.log(
						JSON.stringify({
							originalLineup,
							ogLineup,
							ogLineupValueAtStart,
							ogAccountBalance,
							currentAccountBalance,
							teamValue,
							maxBid,
						})
					);
					return {
						whoDis: user.userName,
						currentAccountBalance,
						teamValue,
						maxBid,
					};
				})
			)
		)
			.filter(e => e.status === 'fulfilled')
			.map(
				e =>
					(
						e as PromiseFulfilledResult<{
							whoDis: string;
							currentAccountBalance: number;
							maxBid: number;
							teamValue: number;
						}>
					).value
			);

		return new Response(toHTML(result), {
			headers: {
				'content-type': 'text/html;charset=UTF-8',
			},
		});
	},
};

const accountBalanceFormatter = new Intl.NumberFormat('de-DE', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0,
});

function toHTML(
	data: { whoDis: string; currentAccountBalance: number; maxBid: number; teamValue: number }[]
): string {
	console.log(JSON.stringify(data));
	return `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<title>Kontostände aller Manager 👀</title>
				<style>
					.data-container {
						display: grid;
						grid-template-columns: min-content min-content min-content min-content;
						grid-gap: 1rem;
					}
					.balance, .maxbid, .teamvalue {
						text-align: right;
					}
				</style>
			</head>
			<body>
				<h1>Kontostände aller Manager 👀</h1>
				<p>
					Hinweis: Tagesboni können nicht erfasst werden. Der berechnete Kontostand weicht um den
					Betrag vom tätsächlichen Kontostand ab, den der Benutzer durch Tagesboni  während der gesamten Saison eingenommen hat.
				</p>

				<div class="data-container">
					<span>Name</span>
					<span>Kontostand</span>
					<span>Teamwert</span>
					<span>Maxbid</span>
					${data
						.map(e => {
							if (!e) return '';
							return `
								<span class="name">${e.whoDis ?? ''}:</span>
								<span class="balance">
									${accountBalanceFormatter.format(e.currentAccountBalance ?? 0)}
								</span>
								<span class="teamvalue">${accountBalanceFormatter.format(e.teamValue ?? 0)}</span>
								<span class="maxbid">${accountBalanceFormatter.format(e.maxBid ?? 0)}</span>
							`;
						})
						.join('')}
				</div>
			</body>
		</html>
	`;
}
