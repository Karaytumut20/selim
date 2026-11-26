import { createAdminSupabaseClient } from "./supabase/server";

export async function applyOrderCoupon(orderId: string, code: string) {
  const { error } = await createAdminSupabaseClient().rpc("apply_store_coupon", { p_order_id: orderId, p_code: code });
  if (error) throw new Error("The coupon is unavailable for this order.");
}
