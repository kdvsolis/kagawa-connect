/**
 * OpenBiometrics client (self-hosted).
 * https://docs.openbiometrics.dev/
 *
 * Local: docker compose -f docker-compose.openbiometrics.yml up -d
 * Base URL default http://127.0.0.1:8000 — no real API key needed when self-hosted.
 */

export type FaceVerifyResult = {
  is_match: boolean;
  similarity: number;
  raw?: unknown;
};

export function openBiometricsConfigured() {
  return Boolean(process.env.OPENBIOMETRICS_BASE_URL?.trim());
}

function baseUrl() {
  return (
    process.env.OPENBIOMETRICS_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000"
  );
}

function authHeader(): HeadersInit {
  const key = process.env.OPENBIOMETRICS_API_KEY?.trim() || "local";
  return { Authorization: `Bearer ${key}` };
}

/** 1:1 face verify — ID photo vs selfie */
export async function verifyFaces(
  idImage: Blob,
  selfieImage: Blob,
  threshold = 0.4
): Promise<FaceVerifyResult | { error: string }> {
  const form = new FormData();
  form.append("image1", idImage, "id.jpg");
  form.append("image2", selfieImage, "selfie.jpg");
  form.append("threshold", String(threshold));

  try {
    const res = await fetch(`${baseUrl()}/api/v1/verify`, {
      method: "POST",
      headers: authHeader(),
      body: form,
    });
    const json = (await res.json()) as {
      is_match?: boolean;
      similarity?: number;
      detail?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        error:
          json.detail ||
          json.error ||
          `OpenBiometrics error (${res.status})`,
      };
    }
    return {
      is_match: Boolean(json.is_match),
      similarity: Number(json.similarity ?? 0),
      raw: json,
    };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Cannot reach OpenBiometrics — is it running on :8000?",
    };
  }
}

/** Health check */
export async function openBiometricsHealth(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    const res = await fetch(`${baseUrl()}/api/v1/admin/health`, {
      headers: authHeader(),
      next: { revalidate: 0 },
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true, detail: await res.text() };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "unreachable",
    };
  }
}
