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

test("public pages expose complete indexable metadata", async () => {
  const worker = await loadWorker();
  const routes = ["/", "/products", "/repairs", "/industries", "/about", "/contact", productRoutes[0]];

  for (const pathname of routes) {
    const response = await request(worker, pathname);
    const html = await response.text();
    assert.match(html, /<title>[^<]+<\/title>/i, `${pathname} should have a title`);
    assert.match(html, /<meta name="description" content="[^"]+"/i, `${pathname} should have a description`);
    assert.match(html, /<link rel="canonical" href="https:\/\/northstar-circuit-works\.umutkaraytu\.chatgpt\.site\//i, `${pathname} should have an absolute canonical`);
    assert.match(html, /<meta property="og:title" content="[^"]+"/i, `${pathname} should have an Open Graph title`);
    assert.match(html, /<meta property="og:image" content="https:\/\//i, `${pathname} should have an absolute social image`);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i, `${pathname} should remain indexable`);
  }
});

test("structured data, crawler files, and private-route directives are consistent", async () => {
  const worker = await loadWorker();
  const homeHtml = await (await request(worker, "/")).text();
  assert.match(homeHtml, /"@type":"WebSite"/);
  assert.match(homeHtml, /"@type":"Organization"/);

  const productHtml = await (await request(worker, productRoutes[0])).text();
  assert.match(productHtml, /"@type":"BreadcrumbList"/);
  assert.match(productHtml, /"@type":"Service"/);

  const robots = await request(worker, "/robots.txt");
  const robotsText = await robots.text();
  assert.equal(robots.status, 200);
  assert.match(robotsText, /Sitemap: https:\/\/northstar-circuit-works\.umutkaraytu\.chatgpt\.site\/sitemap\.xml/);
  assert.match(robotsText, /Disallow: \/admin/);
  assert.match(robotsText, /Disallow: \/api\//);

  const sitemap = await request(worker, "/sitemap.xml");
  const sitemapText = await sitemap.text();
  assert.equal(sitemap.status, 200);
  assert.match(sitemapText, /<loc>https:\/\/northstar-circuit-works\.umutkaraytu\.chatgpt\.site\/products<\/loc>/);
  assert.doesNotMatch(sitemapText, /<loc>[^<]+\/admin<\/loc>/);
  assert.doesNotMatch(sitemapText, /<loc>[^<]+\/(privacy|terms)<\/loc>/);

  const admin = await request(worker, "/admin");
  assert.match(admin.headers.get("x-robots-tag") ?? "", /noindex, nofollow/);

  const api = await request(worker, "/api/catalog/products");
  assert.match(api.headers.get("x-robots-tag") ?? "", /noindex, nofollow/);
});

test("the public site uses U.S. English and region-aware service signals", async () => {
  const worker = await loadWorker();
  const homeHtml = await (await request(worker, "/")).text();

  assert.match(homeHtml, /<html[^>]+lang="en-US"/i);
  assert.match(homeHtml, /Northeast-focused/i);
  assert.match(homeHtml, /"@type":"AdministrativeArea","name":"Northeastern United States"/);
  assert.match(homeHtml, /"@type":"Country","name":"United States"/);
});
