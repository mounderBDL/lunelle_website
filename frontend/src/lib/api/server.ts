export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** revalidateSeconds = 0 means "never cache" (used for orders, whose status changes). */
function fetchOptions(revalidateSeconds: number): RequestInit {
  return revalidateSeconds > 0 ? { next: { revalidate: revalidateSeconds } } : { cache: "no-store" };
}

/** Server-side GET with a short cache, so the shop stays fast but stock/price changes show within seconds. */
export async function apiGet<T>(path: string, revalidateSeconds = 30): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, fetchOptions(revalidateSeconds));
  if (!res.ok) {
    throw new Error(`API ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Same, but a 404 means "does not exist" and returns null (any other failure still throws). */
export async function apiGetOrNull<T>(path: string, revalidateSeconds = 30): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}${path}`, fetchOptions(revalidateSeconds));
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`API ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}