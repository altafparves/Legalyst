const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getApiUrl(path: string): string {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return new URL(path, `${apiBaseUrl.replace(/\/$/, "")}/`).toString();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), init);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
