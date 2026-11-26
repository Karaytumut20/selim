const targetBytes = 300 * 1024;
const webpQualities = [0.84, 0.76, 0.68, 0.60];

export async function optimizeImageForUpload(file: File) {
  if (typeof createImageBitmap !== "function") return file;
  if (file.size <= targetBytes && ["image/webp", "image/avif"].includes(file.type)) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  try {
    const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let webp: Blob | undefined;
    for (const quality of webpQualities) {
      const encoded = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (encoded?.type !== "image/webp") return file;
      if (!webp || encoded.size < webp.size) webp = encoded;
      if (webp.size <= targetBytes) break;
    }
    if (!webp || (scale === 1 && webp.size >= file.size)) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "product";
    return new File([webp], `${name}.webp`, { type: webp.type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
