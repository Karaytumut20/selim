import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "./supabase/server";
import type { ShippingQuote } from "./shipping";

type ProductInput = { id: string; name: string; slug: string; partNumber: string; price?: number };
type OrderInput = { customerEmail: string; customerName: string; phone: string; addressLine1: string; addressLine2?: string;
  city: string; state: string; postalCode: string; country: string; paymentMethod: "stripe" | "invoice";
  shippingMethod: string; shippingRateAmount?: number; shippingQuote?: ShippingQuote | null; notes?: string;
};
type OrderItem = { id: string; productName: string; productCode: string; quantity: number; unitPrice: number };
type Order = { id: string; orderNumber: string; customerEmail: string; status: string; paymentStatus: string; shippingStatus: string;
  inventoryStatus: string; taxAmount: number; total: number | null; subtotal: number | null; refundAmount: number;
  discountAmount: number; shippingRateAmount: number | null; items: OrderItem[];
};

type OrderRow = {
  id: string; order_number: string; customer_email: string; status: string; payment_status: string; shipping_status: string;
  inventory_status: string; tax_amount: number; total: number | null; subtotal: number | null; refund_amount: number;
  discount_amount: number; shipping_rate_amount: number | null;
  order_items: Array<{ id: string; product_name: string; product_code: string; quantity: number; unit_price: number }>;
};
const orderFields = "id,order_number,customer_email,status,payment_status,shipping_status,inventory_status,tax_amount,total,subtotal,refund_amount,discount_amount,shipping_rate_amount,order_items(id,product_name,product_code,quantity,unit_price)";

function fromRow(row: OrderRow): Order {
  return { id: row.id, orderNumber: row.order_number, customerEmail: row.customer_email, status: row.status,
    paymentStatus: row.payment_status, shippingStatus: row.shipping_status, inventoryStatus: row.inventory_status,
    taxAmount: row.tax_amount, total: row.total, subtotal: row.subtotal, refundAmount: row.refund_amount,
    discountAmount: row.discount_amount, shippingRateAmount: row.shipping_rate_amount,
    items: row.order_items.map((item) => ({ id: item.id, productName: item.product_name, productCode: item.product_code,
      quantity: item.quantity, unitPrice: item.unit_price })),
  };
}

export function customerOrderView(order: Order) {
  return { id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus, subtotal: order.subtotal, total: order.total, taxAmount: order.taxAmount,
    shippingRateAmount: order.shippingRateAmount, discountAmount: order.discountAmount, items: order.items };
}

export async function getCustomerOrders(email: string) {
  const { data, error } = await createAdminSupabaseClient().from("orders").select(orderFields)
    .eq("customer_email", email).like("order_number", "QA-%").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Orders could not be loaded.");
  return data.map(fromRow);
}

async function findOrder(field: "id" | "stripe_payment_intent_id", value: string) {
  const { data, error } = await createAdminSupabaseClient().from("orders").select(orderFields).eq(field, value).maybeSingle();
  if (error) throw new Error("The order could not be loaded.");
  return data ? fromRow(data) : null;
}
export const getOrderForAdmin = (id: string) => findOrder("id", id);
export const getOrderByStripePaymentIntent = (id: string) => findOrder("stripe_payment_intent_id", id);

export async function createCustomerOrder(input: OrderInput, lines: Array<{ product: ProductInput; quantity: number }>) {
  const id = randomUUID();
  const items = lines.map(({ product, quantity }) => {
    if (!product.price || !Number.isFinite(product.price) || product.price <= 0) throw new Error("A product requires a manual price review.");
    const cents = Math.round(product.price * 100);
    if (cents <= 0 || Math.abs(cents / 100 - product.price) > 0.000001) throw new Error("A product price is invalid.");
    return { id: randomUUID(), product_id: product.id, product_slug: product.slug, product_name: product.name,
      product_code: product.partNumber, unit_price: cents / 100, quantity, cents: cents * quantity };
  });
  const subtotal = items.reduce((total, item) => total + item.cents, 0);
  const { error } = await createAdminSupabaseClient().rpc("create_store_order_with_items", { p_order: {
    id, order_number: `QA-${id}`, customer_email: input.customerEmail, customer_name: input.customerName, phone: input.phone,
    address_line_1: input.addressLine1, address_line_2: input.addressLine2 || null, city: input.city, state: input.state,
    postal_code: input.postalCode, country: input.country, payment_method: input.paymentMethod, currency: "USD",
    subtotal: subtotal / 100, total: (subtotal + Math.round((input.shippingRateAmount ?? 0) * 100)) / 100,
    shipping_method: input.shippingMethod, shipping_rate_amount: input.shippingRateAmount ?? null,
    shipping_quote: input.shippingQuote ?? null, notes: input.notes || null,
  }, p_items: items });
  if (error) throw new Error("The order could not be created.");
  return getOrderForAdmin(id);
}

const lifecycleColumns = {
  status: "status", paymentStatus: "payment_status", shippingStatus: "shipping_status", shippingProvider: "shipping_provider",
  stripeCheckoutSessionId: "stripe_checkout_session_id", stripePaymentIntentId: "stripe_payment_intent_id", stripeCustomerId: "stripe_customer_id",
  taxAmount: "tax_amount", total: "total", refundAmount: "refund_amount", refundStatus: "refund_status",
} as const;

export async function updateOrderLifecycle(id: string, changes: Partial<Record<keyof typeof lifecycleColumns, string | number | null>>) {
  const update = Object.fromEntries(Object.entries(changes).map(([key, value]) => [lifecycleColumns[key as keyof typeof lifecycleColumns], value]));
  const { data, error } = await createAdminSupabaseClient().from("orders").update(update).eq("id", id)
    .select(orderFields).single();
  if (error) throw new Error("The order could not be updated.");
  return fromRow(data);
}

export async function markOrderSubmitted(id: string) {
  const { error } = await createAdminSupabaseClient().from("orders").update({ submitted_at: new Date().toISOString() })
    .eq("id", id).is("submitted_at", null);
  if (error) throw new Error("Order submission could not be confirmed.");
}

export async function claimStripeEvent(id: string, type: string) {
  const { data, error } = await createAdminSupabaseClient().rpc("claim_store_stripe_event", { p_id: id, p_type: type });
  if (error) throw new Error("The Stripe event could not be claimed.");
  return data;
}

async function finishStripeEvent(id: string, status: "succeeded" | "failed", errorMessage: string | null) {
  const { error } = await createAdminSupabaseClient().from("stripe_events")
    .update({ status, error_message: errorMessage }).eq("id", id).eq("status", "processing");
  if (error) throw new Error("The Stripe event outcome could not be recorded.");
}
export const completeStripeEvent = (id: string) => finishStripeEvent(id, "succeeded", null);
export const failStripeEvent = (id: string, reason: string) => finishStripeEvent(id, "failed", reason.slice(0, 800));
