export type ApiErrorKind =
  | "validation"
  | "auth"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "server"
  | "network";

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;

  constructor(status: number, message: string, kind: ApiErrorKind) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
  }
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  return "server";
}

export function messageFromStatus(status: number, body: string): string {
  if (body.trim()) return body.trim();
  if (status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (status === 403) return "No tienes permiso para esta acción.";
  if (status === 404) return "No encontrado.";
  if (status >= 500) return "Ocurrió un problema. Inténtalo de nuevo.";
  return "No se pudo completar la solicitud.";
}
