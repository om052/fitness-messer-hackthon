const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

export async function apiFetch(path: string, token?: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the Fitness Messer API at ${API_BASE}. Check that the backend is running and that CORS allows this frontend.`,
      );
    }
    throw error;
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let message = res.statusText;
    if (contentType.includes("application/json")) {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    } else {
      message = (await res.text()) || message;
    }
    throw new Error(`API request failed (${res.status}): ${message || "Unknown error"}`);
  }
  return res.json();
}