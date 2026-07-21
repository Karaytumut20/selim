import assert from "node:assert/strict";
import test from "node:test";

const staticRoutes = [
  "/",
  "/products",
  "/repairs",
  "/industries",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/admin",
];

const productRoutes = [
  "axc-900-industrial-control-board",
  "a-440-machine-control-pcb",
  "c-220-plc-communication-board",
  "s-760-servo-drive-control-board",
  "h-180-hmi-main-logic-board",
  "p-310-industrial-power-supply-pcb",
  "m-610-cnc-interface-board",
  "a-520-process-control-board",
  "c-340-remote-io-board",
  "s-420-drive-interface-board",
  "h-240-operator-panel-controller",
  "p-480-dc-power-regulation-board",
  "m-720-cnc-axis-control-board",
  "i-115-industrial-relay-board",
].map((slug) => `/products/${slug}`);

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

function request(worker, pathname) {
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {},
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("all catalog pages render without the Cloudflare image optimizer", async () => {
  const worker = await loadWorker();

  for (const pathname of [...staticRoutes, ...productRoutes]) {
    const response = await request(worker, pathname);
    assert.equal(response.status, 200, `${pathname} should render successfully`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

    const html = await response.text();
    assert.doesNotMatch(
      html,
      /\/_vinext\/image/,
      `${pathname} should serve local product images directly`,
    );
  }
});

test("an optimizer request without Cloudflare bindings fails safely", async () => {
  const worker = await loadWorker();
  const response = await request(
    worker,
    "/_vinext/image?url=%2Fimages%2Fproducts%2Fcategory-control.jpg&w=640&q=75",
  );

  assert.equal(response.status, 503);
  assert.match(await response.text(), /unavailable/i);
});
