export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidMxPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length === 10 || (digits.length === 12 && digits.startsWith("52"));
}

/** Formato legible: 444 457 9256 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = normalizePhone(value);
  const national = digits.length === 12 && digits.startsWith("52") ? digits.slice(2) : digits;
  if (national.length !== 10) return value;
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

export function whatsappHref(phone: string | null | undefined, message?: string): string | null {
  const digits = normalizePhone(phone ?? "");
  if (!digits) return null;
  const international = digits.length === 10 ? `52${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${international}${text}`;
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = normalizePhone(phone ?? "");
  return digits ? `tel:${digits}` : null;
}
