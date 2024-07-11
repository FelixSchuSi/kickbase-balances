import { LoginResponse, authService } from "./service/auth.service";
import { leagueService } from "./service/league.service";
import { calculateAccountBalance } from "./calculate-account-balance";

export interface NumberRange {
  min: number;
  max: number;
}

export interface UserBalanceData {
  username: string;
  currentBalance: NumberRange;
  maxBid: NumberRange;
  teamValue: number;
}

const MONEY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

async function fetchAndCalculateBalances(
  leagueId: string
): Promise<UserBalanceData[]> {
  if (leagueId === undefined) return [];
  const leaguePlayersResult = await leagueService.getUsers(leagueId);

  return await Promise.all(
    leaguePlayersResult.map((user) => calculateAccountBalance(user, leagueId))
  );
}

function toHTML(data: UserBalanceData[]): string {
  const header = `
    <span>Name</span>
    <span>Kontostand</span>
    <span>Teamwert</span>
    <span>Maxbid</span>
  `;

  console.log('custom data', data)
  const rows = data.map(
    (e) => `
      <span class="name">${e.username}:</span>
      <span class="balance"> ${e.currentBalance.min} - ${e.currentBalance.max} </span>
      <span class="teamvalue"> ${MONEY_FORMATTER.format(e.teamValue)} </span>
      <span class="maxbid"> ${MONEY_FORMATTER.format(
        e.maxBid.min
      )} - ${MONEY_FORMATTER.format(e.maxBid.max)} </span>
    `
  );
  return header + rows.join("");
}

async function login(): Promise<LoginResponse> {
  const username =
    localStorage.getItem("KB_EMAIL") ??
    prompt("Kickbase E-Mail eingeben:") ??
    "";
  const password =
    localStorage.getItem("KB_PASSWORD") ?? prompt("Kickbase Passwort:") ?? "";
  const loginResult = await authService.login(username, password);

  if (loginResult === undefined) {
    alert("Login failed");
    throw new Error("Login failed");
  }
  localStorage.setItem("KB_EMAIL", username);
  localStorage.setItem("KB_PASSWORD", password);

  return loginResult;
}

const leagueSelect = document.getElementById(
  "league-select"
) as HTMLSelectElement;

leagueSelect.addEventListener("change", async () => {
  const leagueId = leagueSelect.value;
  document.querySelector(".loading-bar")?.classList.add("loading");
  const data = await fetchAndCalculateBalances(leagueId);
  document.querySelector(".loading-bar")?.classList.remove("loading");
  document.querySelector(".data-container")!.innerHTML = toHTML(data);
});

login().then(async (loginResponse: LoginResponse) => {
  leagueSelect.innerHTML = `
    <option value="">Liga auswählen</option>
    ${loginResponse.leagues
      .map((league) => `<option value="${league.id}">${league.name}</option>`)
      .join("")}
  `;
});
