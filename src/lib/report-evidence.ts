/** Shrink a complaint photo so it can sit on the report. Not for ID scans. */
export async function compressReportPhoto(
  file: File
): Promise<{ name: string; dataUrl: string } | { error: "type" | "size" }> {
  if (!file.type.startsWith("image/")) return { error: "type" };
  const bitmap = await createImageBitmap(file);
  const max = 960;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { error: "size" };
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.62);
  if (dataUrl.length > 140_000) return { error: "size" };
  return { name: file.name.slice(0, 120), dataUrl };
}
