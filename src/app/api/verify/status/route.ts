import { NextResponse } from "next/server";
import {
  applyDiditDecision,
  diditConfigured,
  fetchDiditSessionDecision,
  getDiditDecision,
  getDiditDecisionBySession,
} from "@/lib/kyc/didit";

export const runtime = "nodejs";

/**
 * GET ?session_id=… and/or ?vendor_data=…
 * Local poll helper when Didit webhooks cannot reach localhost.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id")?.trim();
  const vendorData = searchParams.get("vendor_data")?.trim();

  if (!sessionId && !vendorData) {
    return NextResponse.json(
      { error: "session_id or vendor_data required" },
      { status: 400 }
    );
  }

  if (vendorData) {
    const local = getDiditDecision(vendorData);
    if (local) {
      return NextResponse.json({
        status: local.status,
        session_id: local.sessionId,
        source: "webhook_store",
      });
    }
  }

  if (sessionId) {
    const local = getDiditDecisionBySession(sessionId);
    if (local) {
      return NextResponse.json({
        status: local.status,
        session_id: sessionId,
        vendor_data: local.vendorData,
        source: "webhook_store",
      });
    }

    if (!diditConfigured()) {
      return NextResponse.json(
        { error: "didit_not_configured", status: "Unknown" },
        { status: 503 }
      );
    }

    const remote = await fetchDiditSessionDecision(sessionId);
    if (remote.error) {
      return NextResponse.json(
        { error: remote.error, status: "Unknown" },
        { status: 502 }
      );
    }

    const status = remote.status ?? "Unknown";
    if (vendorData) {
      applyDiditDecision(vendorData, status, {
        sessionId,
        decision: remote.decision,
      });
    } else {
      applyDiditDecision(`session:${sessionId}`, status, {
        sessionId,
        decision: remote.decision,
      });
    }

    return NextResponse.json({
      status,
      session_id: sessionId,
      source: "didit_api",
    });
  }

  return NextResponse.json({ status: "Unknown", source: "none" });
}
