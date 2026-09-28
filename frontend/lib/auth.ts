export type AuthMode = "login" | "register";

export type AuthCredentials = {
  email: string;
  password: string;
};

// Stub until real auth is wired up in #18. Simulates a network round trip so
// the form's pending state can be exercised, but never talks to the backend.
export async function submitAuth(
  mode: AuthMode,
  credentials: AuthCredentials,
): Promise<void> {
  void mode;
  void credentials;
  await new Promise((resolve) => setTimeout(resolve, 600));
}
