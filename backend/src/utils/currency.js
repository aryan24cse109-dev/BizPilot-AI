import Decimal from "decimal.js";

export function toMinorUnits(amount) {
  const value = new Decimal(amount);
  if (!value.isFinite() || value.lte(0) || !value.mul(100).isInteger()) {
    throw new Error("Amount must be a positive value with at most two decimals.");
  }
  const minor = value.mul(100);
  if (minor.gt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Amount is too large for the payment provider.");
  }
  return minor.toNumber();
}

export function decimalString(value) {
  return new Decimal(value ?? 0).toFixed(2);
}