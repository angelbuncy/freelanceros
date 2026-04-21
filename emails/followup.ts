export function followUpEmail({
  freelancerName,
  clientName,
  work,
  amount,
  dueDate,
}: {
  freelancerName: string;
  clientName: string;
  work: string;
  amount: number;
  dueDate: string;
}) {
  return `
    <p>Hi ${clientName},</p>

    <p>
      Just following up regarding the <b>${work}</b> work.
    </p>

    <p>
      The invoice of <b>₹${amount}</b> was due on <b>${dueDate}</b>.
    </p>

    <p>
      Please let me know if you need anything from my side.
    </p>

    <p>
      Thanks,<br/>
      ${freelancerName}
    </p>

    <hr />
    <p style="font-size:12px;color:#888;">
      This reminder was sent automatically via FreelancerOS.
    </p>
  `;
}
