export interface LoginResponse {
  token: string;
  token_expire: Date;
  username: string;
  password: string;
  leagues: { id: string; amd: boolean; name: string }[];
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  notifications: number;
  profile: string;
}

export class AuthService {
  #token?: string;

  public get token(): string | undefined {
    return this.#token;
  }

  public get requestHeaders(): any {
    if (!this.#token) return {};
    return {
      headers: {
        Authorization: `Bearer ${this.#token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
  }

  public async login(
    email: string,
    password: string
  ): Promise<LoginResponse | undefined> {
    let response: Response;
    try {
      response = await fetch("https://api.kickbase.com/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (e) {
      return;
    }
    if (response.status !== 200) return;
    const responseJson = (await response.json()) as LoginResponse;
    this.#token = responseJson.token;
    return responseJson;
  }
}

export const authService = new AuthService();
