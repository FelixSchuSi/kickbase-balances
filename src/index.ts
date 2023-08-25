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
  const username =
    localStorage.getItem("KB_EMAIL") ??
    prompt("Kickbase E-Mail eingeben:") ??
    "";
  const password =
    localStorage.getItem("KB_PASSWORD") ?? prompt("Kickbase Passwort:") ?? "";
  const loginResult = await authService.login(username, password);

  if (loginResult === undefined) {
    alert("Login failed");
    return [];
  }

  localStorage.setItem("KB_EMAIL", username);
  localStorage.setItem("KB_PASSWORD", password);

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
  document.querySelector(".loading-bar")?.classList.add("loading");
  const data = await fetchData();
  document.querySelector(".loading-bar")?.classList.remove("loading");
  const html = toHTML(data);
  document.querySelector(".data-container")!.innerHTML = html;
}

fetchAndrender();
