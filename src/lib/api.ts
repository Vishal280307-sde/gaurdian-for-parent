let memoryBearerToken: string | null = null;

export function setMemoryAuthToken(token: string | null): void {
  memoryBearerToken = token;
}

export function getMemoryAuthToken(): string | null {
  return memoryBearerToken;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (memoryBearerToken) {
    headers.set("Authorization", `Bearer ${memoryBearerToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
