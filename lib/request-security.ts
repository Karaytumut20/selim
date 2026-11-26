export async function guardedRequest(request: Request) {
  const site = process.env.CHECKOUT_ORIGIN?.trim();
  if (!site || request.headers.get("origin") !== site) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json({ error: "JSON is required." }, { status: 415 });
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (!reader) return Response.json({ error: "Request body is missing." }, { status: 400 });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64000) {
        await reader.cancel().catch(() => undefined);
        return Response.json({ error: "Checkout request is too large." }, { status: 413 });
      }
      chunks.push(value);
    }
    return new Request(request.url, { method: "POST", headers: request.headers, body: Buffer.concat(chunks) });
  } catch {
    return Response.json({ error: "Checkout request could not be read." }, { status: 400 });
  }
}
