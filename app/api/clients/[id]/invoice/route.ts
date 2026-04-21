import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { adminDb, getServerUser } from "@/lib/firebase/admin";
import { formatMoney } from "@/lib/currency";

type Params = { params: Promise<{ id: string }> };

// GET /api/clients/[id]/invoice — PDF download
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docRef = adminDb.collection("clients").doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()?.user_id !== user.uid) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const c = snap.data()!;
  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  const profile = profileSnap.data();
  const businessName = profile?.full_name || "Freelancer";

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  let y = 22;

  pdf.setFillColor(16, 185, 129);
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text("INVOICE", 18, 18);

  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(11);
  y = 38;
  pdf.text(businessName, 18, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  if (profile?.sender_email) {
    pdf.text(String(profile.sender_email), 18, y);
    y += 5;
  }
  if (profile?.payment_link) {
    pdf.text(`Pay online: ${profile.payment_link}`, 18, y);
    y += 5;
  }

  y += 8;
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(10);
  pdf.text("Bill to", 18, y);
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.text(String(c.client_name), 18, y);
  pdf.setFont("helvetica", "normal");
  y += 5;
  pdf.setTextColor(80, 80, 80);
  pdf.text(String(c.client_email), 18, y);
  y += 12;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(18, y, pageW - 18, y);
  y += 8;

  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(10);
  pdf.text("Description", 18, y);
  pdf.text("Amount", pageW - 18, y, { align: "right" });
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 60);
  const workLines = pdf.splitTextToSize(String(c.work || "Services"), pageW - 60);
  pdf.text(workLines, 18, y);
  const lineH = Math.max(6, workLines.length * 5);
  pdf.setTextColor(30, 30, 30);
  pdf.text(formatMoney(Number(c.amount), String(c.currency || "INR")), pageW - 18, y + 2, {
    align: "right",
  });
  y += lineH + 6;

  pdf.line(18, y, pageW - 18, y);
  y += 10;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total due", 18, y);
  pdf.text(formatMoney(Number(c.amount), String(c.currency || "INR")), pageW - 18, y, { align: "right" });
  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Due date: ${c.due_date}`, 18, y);
  y += 5;
  pdf.text(`Invoice #${id.slice(0, 8)}`, 18, y);
  y += 5;
  if (c.paid) {
    pdf.setTextColor(16, 185, 129);
    pdf.text("Status: PAID", 18, y);
  } else {
    pdf.setTextColor(200, 140, 0);
    pdf.text("Status: Unpaid", 18, y);
  }

  const buf = pdf.output("arraybuffer");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${id.slice(0, 8)}.pdf"`,
    },
  });
}
