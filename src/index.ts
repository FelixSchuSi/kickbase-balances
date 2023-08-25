import { authService } from "./service/auth.service";
import { leagueService } from "./service/league.service";
import { calculateAccountBalance } from "./calculate-account-balance";

export interface UserBalanceData {
  username: string;
  currentBalance: number;
  maxBid: number;
  teamValue: number;
}

const MONEY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

async function fetchData(): Promise<UserBalanceData[]> {
  const loginResult = await authService.login(
    localStorage.getItem("KB_EMAIL") ?? "",
    localStorage.getItem("KB_PASSWORD") ?? ""
  );
  if (loginResult === undefined) {
    alert("Login failed");
    return [];
  }
  const leagueId = loginResult.leagues.find(
    (league) => league.amd === true
  )?.id;
  if (leagueId === undefined) return [];
  const leaguePlayersResult = await leagueService.getUsers(leagueId);

  return await Promise.all(
    leaguePlayersResult.map((user) =>
      calculateAccountBalance(user.userId, leagueId, user.userName)
    )
  );
}

function toHTML(data: UserBalanceData[]): string {
  const header = `
    <span>Name</span>
    <span>Kontostand</span>
    <span>Teamwert</span>
    <span>Maxbid</span>
  `;
  const rows = data.map(
    (e) => `
      <span class="name">${e.username}:</span>
      <span class="balance"> ${MONEY_FORMATTER.format(e.currentBalance)} </span>
      <span class="teamvalue"> ${MONEY_FORMATTER.format(e.teamValue)} </span>
      <span class="maxbid"> ${MONEY_FORMATTER.format(e.maxBid)} </span>
    `
  );
  return header + rows.join("");
}

async function fetchAndrender() {
  const data = await fetchData();
  const html = toHTML(data);
  document.querySelector(".data-container")!.innerHTML = html;
}

fetchAndrender();
