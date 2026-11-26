import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "./supabase/server";

export async function claimCheckoutIntent(userId: string, key: string, body: string) {
  if (!/^[a-z0-9-]{16,80}$/i.test(key)) throw new Error("A checkout ID is required.");
  const { data, error } = await createAdminSupabaseClient().rpc("claim_checkout_intent", {
    p_user: userId, p_key: key, p_hash: createHash("sha256").update(body).digest("hex"),
  });
  if (error || !data) throw new Error("Checkout could not be started with this checkout ID.");
  return data as { claimed: boolean; state: "processing" | "complete"; body: unknown; status: number };
}

export async function finishCheckoutIntent(userId: string, key: string, response: Response) {
  const body: unknown = await response.json();
  const { error } = await createAdminSupabaseClient().from("checkout_intents").update({
    state: "complete", response_body: body, response_status: response.status,
  }).eq("user_id", userId).eq("intent_key", key).eq("state", "processing");
  if (error) throw new Error("Checkout needs review. Check your orders before retrying.");
  return Response.json(body, { status: response.status });
}
