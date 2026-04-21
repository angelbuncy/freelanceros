import { reminderBody, reminderSubject, type ReminderTone } from "@/lib/reminder-copy";

/** Sample placeholders — real sends use live client + profile data. */
export const EMAIL_TEMPLATE_DEMO = {
  freelancerName: "{{sender_name}}",
  clientName: "{{client_name}}",
  work: "{{work}}",
  currency: "INR",
  amount: 5000,
  dueDate: "{{due_date}}",
  paymentLink: "{{payment_link}}",
} as const;

export function demoSubject(tone: ReminderTone): string {
  return reminderSubject(tone, EMAIL_TEMPLATE_DEMO.freelancerName);
}

export function demoBody(tone: ReminderTone): string {
  return reminderBody({
    tone,
    clientName: EMAIL_TEMPLATE_DEMO.clientName,
    work: EMAIL_TEMPLATE_DEMO.work,
    currency: EMAIL_TEMPLATE_DEMO.currency,
    amount: EMAIL_TEMPLATE_DEMO.amount,
    dueDate: EMAIL_TEMPLATE_DEMO.dueDate,
    paymentLink: EMAIL_TEMPLATE_DEMO.paymentLink,
    freelancerName: EMAIL_TEMPLATE_DEMO.freelancerName,
  });
}

export const TONE_META: Record<
  ReminderTone,
  { label: string; description: string; badgeClass: string }
> = {
  polite: {
    label: "Polite",
    description: "First touch — friendly nudge after the due date.",
    badgeClass: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25",
  },
  firm: {
    label: "Firm",
    description: "Clearer ask — used after several attempts.",
    badgeClass: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25",
  },
  final: {
    label: "Final",
    description: "Strongest wording — last notice before you escalate offline.",
    badgeClass: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25",
  },
};
