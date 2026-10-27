import { getSession, clearSession } from "@/features/auth/session";
import { ApiError, kindFromStatus, messageFromStatus } from "@/shared/api/errors";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

async function parseError(response: Response): Promise<ApiError> {
  const text = await response.text();
  let message = text;
  try {
    const json = JSON.parse(text) as {
      message?: string;
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    const fieldErrors = json.errors
      ? Object.values(json.errors).flat().filter(Boolean).join(" ")
      : "";
    message = json.message ?? json.detail ?? json.title ?? fieldErrors ?? text;
  } catch {
    message = text;
  }
  return new ApiError(
    response.status,
    messageFromStatus(response.status, message),
    kindFromStatus(response.status),
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;
  const session = skipAuth ? null : getSession();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  }).catch(() => {
    throw new ApiError(0, "Sin conexión. Revisa tu red e inténtalo de nuevo.", "network");
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ppt:unauthorized"));
      if (!window.location.pathname.startsWith("/login")) {
        const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.assign(`/login?returnTo=${returnTo}`);
      }
    }
    throw await parseError(response);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: formData });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo completar la solicitud.";
}
