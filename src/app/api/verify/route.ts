import { NextResponse } from "next/server";
import {
  createDiditSession,
  DIDIT_WORKFLOW_ID,
} from "@/lib/kyc/didit";
import { diditReady, isSimulation } from "@/lib/runtime-mode";

export const runtime = "nodejs";

/**
 * POST { vendorData?: string } → { url, session_id }
 * Creates a Didit session server-side (API key never reaches the browser).
 */
export async function POST(req: Request) {
  if (!diditReady()) {
    return NextResponse.json(
      {
        error: isSimulation() ? "simulation" : "didit_not_configured",
        detail: isSimulation()
          ? "Simulation uses the test ID button. Didit is not called."
          : "Set KAGAWA_MODE=production and a real DIDIT_API_KEY.",
      },
      { status: isSimulation() ? 409 : 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    vendorData?: string;
  };

  const vendorData =
    typeof body.vendorData === "string" && body.vendorData.trim()
      ? body.vendorData.trim()
      : `anon-${crypto.randomUUID()}`;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:43123";

  const session = await createDiditSession({
    vendorData,
    callback: `${appUrl}/verify/done`,
    metadata: { app: "kagawa", workflow: DIDIT_WORKFLOW_ID },
  });

  if ("error" in session) {
    return NextResponse.json(
      { error: session.error, detail: session.detail },
      { status: 502 }
    );
  }

  return NextResponse.json({
    url: session.url,
    session_id: session.session_id,
    vendor_data: vendorData,
  });
}
