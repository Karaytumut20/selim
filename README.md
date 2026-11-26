# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Restored checkout sandbox

`npm run test:commerce` runs the recovered schema and the test checkout workflow
with isolated PostgreSQL and simulated Stripe, EasyPost, and Brevo responses.
Run `npm run build && npm run test:commerce:http` to also start an isolated
Next.js server and exercise the checkout, webhooks, and email over HTTP.
The checkout is disabled by default and the implementation accepts only
Stripe test keys, EasyPost test responses, and one allowlisted customer.

To add a real Stripe sandbox webhook to the isolated HTTP test, sign in to the
intended sandbox with Stripe CLI and set `STRIPE_QA_CLI_CONFIG` to that CLI config
path and `STRIPE_QA_SANDBOX_ID` to the expected account ID. The test checks test
mode, asks Stripe to generate a checkout event, and verifies the signed event
updates the isolated order and stock.

For a real provider sandbox run:

1. Use an isolated Supabase project. Apply the migrations in order once,
   create a test customer matching `TEST_CUSTOMER_EMAIL`, and add a USD test
   product with positive stock plus packed dimensions and weight in Content Studio.
2. Copy the variable names from `.env.example` to a private `.env.local`.
   Set the exact app origin, the Supabase URL and keys, and the test credentials.
   For real test email, enable `ENABLE_TEST_EMAIL` and use a verified Brevo sender.
3. Run `npm run check:integrations` and `npm run check:easypost`. Start the app with
   `npm run dev`, then use `/checkout` and the admin page at `/admin/test-orders`.
4. Forward Stripe test events to `/api/stripe/webhook` and EasyPost test events
   to `/api/integrations/easypost/webhook`. Use the exact origin of the preview
   and make sure the providers can reach the signed webhook routes.
5. Use a test card, verify payment in order history, create a test label and
   check the test inbox. Provider API acceptance and inbox delivery are separate.

This sandbox does not enable commercial checkout or production label purchases.

For local Supabase with Docker, run `npx supabase start` from this repository.
On an Apple silicon Mac without Docker, the native runtime is available with
`SUPABASE_EXPERIMENTAL_STACK=1 npx supabase@2.121.0 start --runtime native`.
Use the local API URL, publishable key and service role key from the CLI in
`.env.local`. The local SMTP inbox receives account confirmation messages.
Run `node --env-file=.env.local scripts/seed-supabase.mjs` to populate a fresh
local catalog and media library.

Configure `NEXT_PUBLIC_SITE_URL` with the site's HTTPS origin on the deployment
host. Set the real sales email in `NEXT_PUBLIC_SALES_EMAIL`. Add the business
phone and WhatsApp number only when confirmed. Order links use a prepared sales
email when no WhatsApp number is configured.

Netlify uses `netlify.toml` and its automatically installed Next.js adapter.
Vercel uses `vercel.json`. Set environment variables for the deployment's
own Supabase project and HTTPS origin. Test keys and test checkout settings
belong in preview environments only.

## Product offers

Apply the offer migration after the commerce migrations and configure Supabase
Auth email signup with a verified sender. Copy the English template from
`supabase/templates/confirmation.html` into **Confirm signup**. Keep email
confirmation enabled and allow the application's `/account/sign-in` confirmation return URL in Supabase.
Use the exact public origin as `OFFER_SITE_URL`. Published USD products expose
**Make an offer**. Customers see their own offers, and the existing admin
allowlist controls **Product offers** in Content Studio.

Allow `/account/reset-password/callback` at the exact site origin in Supabase
Auth and use `{{ .ConfirmationURL }}` in the recovery email link. Customers open
the link in the browser where they requested it, then sign in with the updated
password. Verify a signup and a password reset through the live project's custom
SMTP before opening registration to customers.

For a manual-order release, set `ENABLE_TEST_CHECKOUT=false`,
`ENABLE_TEST_LABELS=false`, and `ENABLE_TEST_EMAIL=false`. Product and quote
buttons prepare a message for sales, who confirms each order directly.
