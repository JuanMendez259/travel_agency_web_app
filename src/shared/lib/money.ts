import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 20 });

export type MoneyValue = string | number | Decimal | null | undefined;

export function toDecimal(value: MoneyValue): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return value instanceof Decimal ? value : new Decimal(value);
}

export function roundMoney(value: string | number | Decimal): Decimal {
  return toDecimal(value).toDecimalPlaces(2);
}

export function addMoney(...values: MoneyValue[]): Decimal {
  return roundMoney(
    values.reduce<Decimal>((sum, value) => sum.plus(toDecimal(value)), new Decimal(0)),
  );
}

export function subtractMoney(a: MoneyValue, b: MoneyValue): Decimal {
  return roundMoney(toDecimal(a).minus(toDecimal(b)));
}

export function multiplyMoney(a: MoneyValue, b: MoneyValue): Decimal {
  return roundMoney(toDecimal(a).times(toDecimal(b)));
}

export function minMoney(a: MoneyValue, b: MoneyValue): Decimal {
  return roundMoney(Decimal.min(toDecimal(a), toDecimal(b)));
}

export function isPositive(value: string | number | Decimal): boolean {
  return toDecimal(value).gt(0);
}

export function formatMxn(value: string | number | Decimal): string {
  const amount = toDecimal(value).toNumber();
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMxnWithCurrency(value: string | number | Decimal): string {
  return `${formatMxn(value)} MXN`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

export function moneyInputValue(value: string | number | Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  return toDecimal(value).toFixed(2);
}
