import { NextResponse } from "next/server";
import { getPaidMark } from "../webhook/route";

export const runtime = "nodejs";

/** Poll whether a fee reference has been confirmed paid (webhook or demo). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const mark = getPaidMark(reference);
  if (!mark) {
    return NextResponse.json({ status: "pending", reference });
  }

  return NextResponse.json({
    status: "paid",
    reference,
    providerTxnId: mark.providerTxnId,
    paidAt: mark.at,
  });
}
