import { requireAdminApiAccess } from "../../../../lib/admin-auth";
import { dispatchNotifications } from "../../../../lib/notifications";
import { testCheckoutEnabled } from "../../../../lib/customer-auth";

export async function POST(request: Request) {
  if (!testCheckoutEnabled()) return Response.json({ error: "Test checkout is disabled." }, { status: 404 });
  const origin = process.env.CHECKOUT_ORIGIN;
  if (!origin || request.headers.get("origin") !== origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const access = await requireAdminApiAccess();
  if ("response" in access && access.response) return access.response;
  try { return Response.json(await dispatchNotifications(5)); }
  catch { return Response.json({ error: "Could not process the test notification queue." }, { status: 503 }); }
}
