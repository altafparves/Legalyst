import { ApiError, apiFetch } from "@/lib/api";

export type AuthMode = "login" | "register";

export type AuthCredentials = {
  email: string;
  password: string;
};

type TokenResponse = { access_token: string; token_type: string };

const TOKEN_KEY = "legalyst_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode); nothing to clear
  }
}

function jsonPost(body: AuthCredentials): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function login(credentials: AuthCredentials): Promise<void> {
  const { access_token } = await apiFetch<TokenResponse>(
    "/auth/login",
    jsonPost(credentials),
  );
  localStorage.setItem(TOKEN_KEY, access_token);
}

// Registering does not return a token, so sign in right after.
export async function submitAuth(
  mode: AuthMode,
  credentials: AuthCredentials,
): Promise<void> {
  if (mode === "register") {
    await apiFetch("/auth/register", jsonPost(credentials));
  }
  await login(credentials);
}

export function authErrorMessage(mode: AuthMode, error: unknown): string {
  if (error instanceof ApiError) {
    if (mode === "register" && error.status === 400) {
      return "Email sudah terdaftar. Silakan masuk.";
    }
    if (mode === "login" && error.status === 401) {
      return "Email atau kata sandi salah.";
    }
    if (error.status === 422) {
      return "Data tidak valid. Periksa kembali email dan kata sandi.";
    }
  }
  return "Tidak dapat terhubung ke server. Coba lagi nanti.";
}
