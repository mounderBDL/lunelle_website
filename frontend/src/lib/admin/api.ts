export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Calls the backend through the same-origin proxy; the admin cookie is attached by the browser. */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    // JSON bodies get their content type; file uploads must let the browser set it (with its boundary)
    headers: { ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}), ...init.headers },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "";
    try {
      message = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      // empty or non-JSON body (for example a 401 from the security layer)
    }
    throw new ApiError(res.status, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}