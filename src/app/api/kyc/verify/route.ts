import { NextResponse } from "next/server";
import { verifyFaces } from "@/lib/kyc/openbiometrics";

export const runtime = "nodejs";

/**
 * POST multipart: id (file), selfie (file)
 * → OpenBiometrics /api/v1/verify (ID face vs selfie)
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const id = form.get("id");
    const selfie = form.get("selfie");
    const thresholdRaw = form.get("threshold");
    const threshold =
      typeof thresholdRaw === "string" && thresholdRaw
        ? Number(thresholdRaw)
        : 0.4;

    if (!(id instanceof Blob) || !(selfie instanceof Blob)) {
      return NextResponse.json(
        { error: "Multipart fields required: id, selfie (image files)" },
        { status: 400 }
      );
    }

    const result = await verifyFaces(id, selfie, threshold);
    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          hint: "Start OpenBiometrics: docker compose -f docker-compose.openbiometrics.yml up -d",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      verified: result.is_match,
      similarity: result.similarity,
      threshold,
      provider: "openbiometrics",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "kyc verify failed" },
      { status: 500 }
    );
  }
}
