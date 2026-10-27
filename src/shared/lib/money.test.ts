import { describe, expect, it } from "vitest";
import { addMoney, formatMxn, multiplyMoney, subtractMoney, toDecimal } from "@/shared/lib/money";

describe("utilidades de dinero", () => {
  it("redondea a dos decimales sin errores de punto flotante", () => {
    expect(addMoney("0.10", "0.20").toFixed(2)).toBe("0.30");
    expect(multiplyMoney("1500.00", 3).toFixed(2)).toBe("4500.00");
    expect(subtractMoney("1000.00", "333.33").toFixed(2)).toBe("666.67");
  });

  it("no rompe con null o vacío", () => {
    expect(toDecimal(null).toNumber()).toBe(0);
    expect(addMoney("", null, 0).toFixed(2)).toBe("0.00");
  });

  it("formatea moneda mexicana", () => {
    expect(formatMxn("1500")).toContain("1,500.00");
    expect(formatMxn("1500")).toContain("$");
  });
});
