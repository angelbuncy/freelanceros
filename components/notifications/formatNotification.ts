export function formatNotification(
  tone: "polite" | "firm" | "final",
  clientName: string,
  work: string
) {
  if (tone === "polite") {
    return `Polite payment reminder sent to ${clientName} for ${work}`;
  }

  if (tone === "firm") {
    return `Firm payment reminder sent to ${clientName} for ${work}`;
  }

  return `Final payment reminder sent to ${clientName} for ${work}`;
}
