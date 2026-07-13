// Deterministic Indian-format numbers. Intl/toLocaleString output differs
// between the build-time Node ICU and browsers (e.g. "₹ 0.00" vs "₹0.00"),
// which breaks hydration — so grouping is done by hand.
export function formatIndianNumber(value: number, fractionDigits = 0): string {
  const negative = value < 0;
  const [intPart, fracPart] = Math.abs(value).toFixed(fractionDigits).split(".");

  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    grouped = `${groups.join(",")},${last3}`;
  }

  return `${negative ? "-" : ""}${grouped}${fracPart ? `.${fracPart}` : ""}`;
}

export function inr(amount: number, fractionDigits = 0): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${formatIndianNumber(Math.abs(amount), fractionDigits)}`;
}

// Compact Indian notation: ₹12.5L, ₹1.2Cr
export function inrCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1).replace(/\.?0+$/, "")}L`;
  if (abs >= 1_000) return `₹${(amount / 1_000).toFixed(1).replace(/\.?0+$/, "")}K`;
  return inr(amount);
}

export function pct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function timeHM(date = new Date()): string {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
