/** Format amount with correct symbol and locale for common freelancer currencies. */
export function formatMoney(amount: number, currency = "INR"): string {
  const code = (currency || "INR").toUpperCase();
  const n = Number(amount) || 0;
  const locale =
    code === "INR" ? "en-IN" : code === "EUR" ? "de-DE" : code === "GBP" ? "en-GB" : "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(n);
  } catch {
    const sym: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    return `${sym[code] ?? code + " "}${n.toLocaleString(locale)}`;
  }
}
