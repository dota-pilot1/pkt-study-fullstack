export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

type RequestOptions = { method?: string; body?: unknown; errorMessage?: string };

/** Fullstack에서는 Tauri HTTP 플러그인 대신 Next Route Handler를 사용한다. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
  });
  if (!response.ok) {
    let message = options.errorMessage ?? "요청을 처리하지 못했습니다.";
    try {
      const body = await response.json() as { message?: string };
      if (body.message) message = body.message;
    } catch { /* 기본 오류 메시지 사용 */ }
    if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function getApiBase() { return ""; }
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit) { return fetch(input, init); }
