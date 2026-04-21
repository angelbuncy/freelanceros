/** Days past due for unpaid invoices; null if not overdue or paid. */
export function overdueDays(dueDate: string | undefined, paid: boolean): number | null {
  if (paid || !dueDate) return null;
  const due = new Date(dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}
