export type ReminderTone = "polite" | "firm" | "final";

export function reminderSubject(tone: ReminderTone, freelancerName: string): string {
  const name = freelancerName || "your freelancer";
  if (tone === "polite") return `Friendly reminder: Invoice from ${name}`;
  if (tone === "firm") return `Action required: Outstanding invoice`;
  return `Final notice: Overdue invoice`;
}

export function reminderBody(params: {
  tone: ReminderTone;
  clientName: string;
  work: string;
  currency: string;
  amount: number;
  dueDate: string;
  paymentLink: string;
  freelancerName: string;
}): string {
  const {
    tone,
    clientName,
    work,
    currency,
    amount,
    dueDate,
    paymentLink,
    freelancerName,
  } = params;
  const linkLine = paymentLink
    ? `Please complete your payment here: ${paymentLink}`
    : "Please arrange payment at your earliest convenience.";
  return `Hi ${clientName},\n\nThis is a ${tone} reminder that your invoice for "${work}" of ${currency} ${amount} was due on ${dueDate}.\n\n${linkLine}\n\nThank you,\n${freelancerName || "Your Freelancer"}`;
}

export function toneFromAttempt(attemptNumber: number): ReminderTone {
  if (attemptNumber >= 5) return "final";
  if (attemptNumber >= 3) return "firm";
  return "polite";
}
