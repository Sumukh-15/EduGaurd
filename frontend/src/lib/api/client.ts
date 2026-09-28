import { ApiError } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export const TOKEN_STORAGE_KEY = "eduguard_access_token";
export const USER_STORAGE_KEY = "eduguard_user";

export class ApiClientError extends Error implements ApiError {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Reusable typed HTTP client for EduGuard backend.
 * Automatically injects Bearer JWT, handles JSON serialization,
 * normalizes error payloads, and handles session expiry on 401.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers = {}, ...customConfig } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const requestHeaders = new Headers(headers);

  // Automatically attach Bearer token if available and not skipped
  if (!skipAuth && typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  // Set Content-Type for JSON payloads if not already specified (e.g. FormData will not have Content-Type set)
  if (!(customConfig.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...customConfig,
    headers: requestHeaders,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new ApiClientError(
      0,
      "Unable to connect to EduGuard. Please make sure the backend service is running."
    );
  }

  // Extract response body
  const contentType = response.headers.get("content-type");
  let responseData: unknown = null;

  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    let detail = "An unexpected error occurred.";

    if (responseData && typeof responseData === "object" && "detail" in responseData) {
      const errorDetail = (responseData as { detail: unknown }).detail;
      if (typeof errorDetail === "string") {
        detail = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        // FastAPI / Pydantic validation error array
        detail = errorDetail.map((err) => (typeof err === "object" && err?.msg ? err.msg : JSON.stringify(err))).join(", ");
      } else {
        detail = JSON.stringify(errorDetail);
      }
    } else if (typeof responseData === "string" && responseData.trim()) {
      detail = responseData;
    }

    // Specific 401 handling on authenticated routes (excluding login attempt)
    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent("eduguard:unauthorized"));
      }
    }

    throw new ApiClientError(response.status, detail);
  }

  return responseData as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
