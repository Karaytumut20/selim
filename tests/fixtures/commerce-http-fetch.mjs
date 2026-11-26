// Loaded only in the isolated Next.js test subprocess.
const fetchOriginal = globalThis.fetch.bind(globalThis);
const fixture = new URL(process.env.COMMERCE_FIXTURE_ORIGIN);
if (fixture.protocol !== "http:" || fixture.hostname !== "127.0.0.1") throw new Error("Expected a loopback fixture");
const providers = new Set(["api.stripe.com", "api.easypost.com", "api.brevo.com"]);

globalThis.fetch = (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (providers.has(url.hostname)) {
    const forwarded = new URL(`/provider/${url.hostname}${url.pathname}${url.search}`, fixture);
    if (input instanceof Request) return fetchOriginal(new Request(forwarded, input), options);
    return fetchOriginal(forwarded, options);
  }
  if (url.origin === fixture.origin || url.origin === process.env.CHECKOUT_ORIGIN) return fetchOriginal(input, options);
  throw new Error(`Checkout fixture forbids requests to ${url.hostname}`);
};
