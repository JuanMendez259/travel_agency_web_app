import { describe, expect, it } from "vitest";
import {
  fromDateTimeLocalValue,
  parseApiDate,
  toDateTimeLocalValue,
} from "@/shared/lib/dates";

describe("fechas de la API", () => {
  it("asume UTC cuando la fecha no trae zona", () => {
    expect(parseApiDate("2026-11-01T08:00:00").toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("respeta la zona cuando viene explícita", () => {
    expect(parseApiDate("2026-11-01T08:00:00Z").toISOString()).toBe("2026-11-01T08:00:00.000Z");
    expect(parseApiDate("2026-11-01T08:00:00-06:00").toISOString()).toBe(
      "2026-11-01T14:00:00.000Z",
    );
  });

  it("convierte fecha local de México a UTC y de regreso", () => {
    const utc = fromDateTimeLocalValue("2026-11-01T08:00");
    expect(utc).toBe("2026-11-01T14:00:00.000Z");
    expect(toDateTimeLocalValue(utc)).toBe("2026-11-01T08:00");
  });
});
