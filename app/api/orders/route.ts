import { createAdminSupabaseClient } from "../../../lib/supabase/server";
import {guardedRequest} from "../../../lib/request-security";
import {claimCheckoutIntent,finishCheckoutIntent} from "../../../lib/checkout-intent";
import { tryDispatchNotifications } from "../../../lib/notifications";
import { applyOrderCoupon } from "../../../lib/coupons";
import { getCustomerUser, testCheckoutEnabled } from "../../../lib/customer-auth";
import { updateCustomerProfile } from "../../../lib/customer-profile";
import { readManagedCatalog } from "../../../lib/catalog-store";
import { createCustomerOrder, customerOrderView, getCustomerOrders, getOrderForAdmin, markOrderSubmitted, updateOrderLifecycle } from "../../../lib/orders";
import { getRecommendedShippingRate, shippingConfigurationState, validateShippingAddress } from "../../../lib/shipping";
import { createStripeCheckoutSession, stripeConfigurationState, StripeRequestError } from "../../../lib/stripe";
import { holdStoreInventory, attachCheckoutSession, releaseCheckoutHold } from "../../../lib/inventory";
import { logOperation } from "../../../lib/operations";

import { njTestTaxEnabled, isNewJersey, njTestTax } from "../../../lib/test-sales-tax";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCustomerUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    return Response.json({ orders: (await getCustomerOrders(user.email)).map(customerOrderView) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load orders." }, { status: 500 });
  }
}

async function createOrderResponse(request: Request, user: NonNullable<Awaited<ReturnType<typeof getCustomerUser>>>) {
 let canDispatch=false;
 try {

  canDispatch=true;
  const body = await request.json().catch(() => null) as {
    couponCode?: unknown;
    customerName?: unknown;
    phone?: unknown;
    addressLine1?: unknown;
    addressLine2?: unknown;
    city?: unknown;
    state?: unknown;
    postalCode?: unknown;
    country?: unknown;
    paymentMethod?: unknown;
    shippingMethod?: unknown;
    notes?: unknown;
    items?: Array<{ productId?: unknown; quantity?: unknown }>;
  } | null;
  const text = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const required = {
    customerName: text(body?.customerName),
    phone: text(body?.phone, 60),
    addressLine1: text(body?.addressLine1, 220),
    city: text(body?.city, 100),
    state: text(body?.state, 100),
    postalCode: text(body?.postalCode, 30),
    country: text(body?.country, 100),
  };
  if (Object.values(required).some((value) => !value) || !Array.isArray(body?.items) || !body.items.length || body.items.length > 8) {
    return Response.json({ error: "Complete the required delivery details and add at least one product." }, { status: 400 });
  }
  if (!/^us$|^united states$/i.test(required.country)) {
    return Response.json({ error: "This store currently ships within the United States only." }, { status: 400 });
  }

  try {
  if (body.items.reduce((sum, line) => sum + (Number(line?.quantity) || 0), 0) > 8) return Response.json({ error: "A test order can contain up to eight units." }, { status: 400 });
  const catalog = (await readManagedCatalog()).filter((p) => p.status === "published");
  const lines = body.items.map((line) => {
    const product = catalog.find((item) => item.id === text(line?.productId, 120));
    const quantity = Number(line?.quantity);
    return { product, quantity };
  });
  if (lines.some((line) => !line.product || line.product.repairSupported === false || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) {
    return Response.json({ error: "One or more cart items are no longer available." }, { status: 400 });
  }
  const quantities = new Map<string, number>();
  for (const line of lines) if (line.product) quantities.set(line.product.id, (quantities.get(line.product.id) || 0) + line.quantity);
  if (lines.some((line) => line.product && (line.product.currency || "USD") !== "USD")) return Response.json({ error: "This store accepts USD orders only." }, { status: 400 });
  if (lines.some((line) => line.product && (line.product.stockQuantity === undefined || quantities.get(line.product.id)! > line.product.stockQuantity))) {
    return Response.json({ error: "One or more cart quantities exceed the currently available store inventory." }, { status: 409 });
  }

    const requestedPaymentMethod = text(body?.paymentMethod, 60) === "stripe" ? "stripe" : "invoice";
    const shippingAddress = {
      name: required.customerName,
      phone: required.phone,
      email: user.email,
      street1: required.addressLine1,
      street2: text(body?.addressLine2, 220),
      city: required.city,
      state: required.state,
      zip: required.postalCode,
      country: /^united states$/i.test(required.country) ? "US" : required.country,
    };
    let shippingRate = null;
    if (shippingConfigurationState().configured) {
      try {
        if (requestedPaymentMethod === "stripe") {
          const verified = await validateShippingAddress(shippingAddress);
          if (!verified.valid) return Response.json({ error: "The shipping address could not be verified. Check the address, state and ZIP code." }, { status: 422 });
        }
        shippingRate = await getRecommendedShippingRate(shippingAddress, lines as Array<{ product: NonNullable<(typeof lines)[number]["product"]>; quantity: number }>);
      } catch (error) {
        if (requestedPaymentMethod === "stripe") {
          await logOperation({ type: "shipping.quote", severity: "warning", message: error instanceof Error ? error.message : "Shipping quote failed." }).catch(() => undefined);
          return Response.json({ error: "Online shipping is unavailable for this order. Please choose invoice review so we can confirm the shipping quote." }, { status: 422 });
        }
      }
    }
    if (requestedPaymentMethod === "stripe" && (!stripeConfigurationState().configured || !shippingConfigurationState().configured || !shippingRate)) {
      return Response.json({ error: "Online card checkout is being prepared. Please choose invoice review for this order or try again later." }, { status: 503 });
    }

    let order = await createCustomerOrder({
      ...required,
      customerEmail: user.email,
      addressLine2: text(body?.addressLine2, 220),
      paymentMethod: requestedPaymentMethod,
      shippingMethod: shippingRate ? `${shippingRate.carrier} ${shippingRate.service}` : text(body?.shippingMethod, 120) || "Shipping quote required",
      shippingRateAmount: shippingRate?.amount,
      shippingQuote: shippingRate,
      notes: text(body?.notes, 1000),
    }, lines as Array<{ product: NonNullable<(typeof lines)[number]["product"]>; quantity: number }>);
    if (!order) throw new Error("Unable to create the order record.");
    const couponCode = text(body?.couponCode, 32).toUpperCase();
    if (couponCode) {
      try { await applyOrderCoupon(order.id,couponCode); order=(await getOrderForAdmin(order.id))!; }
      catch(error) { await updateOrderLifecycle(order.id,{status:"cancelled",paymentStatus:"failed"}); return Response.json({error:error instanceof Error?error.message:"Coupon unavailable."},{status:409}); }
    }
    if (njTestTaxEnabled()) {
      if (requestedPaymentMethod === "stripe" && !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("NJ sandbox tax cannot be used for live payments.");
      if (isNewJersey(required.state) && order.subtotal !== null) {
        const totals = njTestTax(order.subtotal, order.discountAmount, order.shippingRateAmount || 0);
        order = (await updateOrderLifecycle(order.id, { taxAmount: totals.taxAmount, total: totals.total }))!;
      } else if (requestedPaymentMethod === "stripe") {
        await updateOrderLifecycle(order.id, { status: "cancelled", paymentStatus: "failed" });
        return Response.json({ error: "This sandbox currently supports New Jersey tax tests only. Use a New Jersey delivery address." }, { status: 422 });
      }
    }
    let checkoutUrl: string | null = null;
    if (requestedPaymentMethod === "stripe" && shippingRate) {
      const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
      try { await holdStoreInventory(order.id, new Date(expiresAt * 1000).toISOString()); }
      catch (error) {
        await updateOrderLifecycle(order.id, { status: "cancelled", paymentStatus: "failed" });
        return Response.json({ error: error instanceof Error ? error.message : "Stock is no longer available." }, { status: 409 });
      }
      let session;
      try { session = await createStripeCheckoutSession(order, order.items, shippingRate, expiresAt); }
      catch (error) {
        // A timeout does not prove that Stripe failed to create the session.
        // Keep its hold until a signed expiration webhook or reconciliation.
        if (error instanceof StripeRequestError && error.definiteRejection) await releaseCheckoutHold(order.id, null);
        await logOperation({ type: "checkout.creation", severity: "error", referenceId: order.id, message: "Checkout setup needs review. Inventory is held until Stripe confirms cancellation or expiry." }).catch(() => undefined);
        throw error;
      }
      checkoutUrl = session.url;
      await attachCheckoutSession(order.id, session.id);
      await updateOrderLifecycle(order.id, {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        shippingProvider: "easypost",
        shippingStatus: shippingRate ? "ready" : "quote_required",
      });
    }
    await updateCustomerProfile(user, {
      fullName: required.customerName,
      phone: required.phone,
      addressLine1: required.addressLine1,
      addressLine2: text(body?.addressLine2, 220),
      city: required.city,
      state: required.state,
      postalCode: required.postalCode,
      country: required.country,
    }).catch(() => undefined);
    await markOrderSubmitted(order.id);
    // Do not return private unit costs to the customer.
    const publicOrder = customerOrderView(order);
    return Response.json({ order: publicOrder, checkoutUrl, paymentPending: requestedPaymentMethod === "stripe" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create order." }, { status: 500 });
  }

 } finally { if(canDispatch) await tryDispatchNotifications(); }
}

async function POSTImpl(request: Request) {
 const user=await getCustomerUser();
 if(!user)return Response.json({error:"Sign in is required."},{status:401});
 const text=await request.text();
 if(text.length>64000)return Response.json({error:"Checkout request is too large."},{status:413});
 const key=request.headers.get("idempotency-key") || "";
 const rateLimit = await createAdminSupabaseClient().rpc("consume_request_limit", {
   p_key: `test-checkout:${user.id}`, p_limit: 18, p_seconds: 60,
 });
 if (rateLimit.error) return Response.json({ error: "Checkout is unavailable." }, { status: 503 });
 if (rateLimit.data !== true) return Response.json({ error: "Wait before retrying checkout." }, { status: 429 });
 try {
  const claim=await claimCheckoutIntent(user.id,key,text);
  if(!claim.claimed) return claim.state==='complete'?Response.json(claim.body,{status:claim.status}):Response.json({error:"This checkout is already processing or needs review. Check order history before retrying."},{status:409});
  const response=await createOrderResponse(new Request(request.url,{method:'POST',headers:request.headers,body:text}),user);
  return response.status >= 500 ? response : await finishCheckoutIntent(user.id,key,response);
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Checkout needs review. Check order history."},{status:409});}
}

export async function POST(request: Request) {
  if (!testCheckoutEnabled()) return Response.json({ error: "Test checkout is disabled." }, { status: 404 });
  const guarded = await guardedRequest(request);
  return guarded instanceof Response ? guarded : POSTImpl(guarded);
}
