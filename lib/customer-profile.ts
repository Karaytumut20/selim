import { createAdminSupabaseClient } from "./supabase/server";

type User = { id: string; email: string };
type Address = { fullName: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string };

export async function getCustomerProfile(user: User): Promise<Address> {
  const { data, error } = await createAdminSupabaseClient().from("customer_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("The customer profile could not be loaded.");
  return {
    fullName: data?.full_name ?? "", phone: data?.phone ?? "", addressLine1: data?.address_line_1 ?? "",
    addressLine2: data?.address_line_2 ?? "", city: data?.city ?? "", state: data?.state ?? "",
    postalCode: data?.postal_code ?? "", country: data?.country ?? "US",
  };
}

export async function updateCustomerProfile(user: User, address: Address) {
  const result = await createAdminSupabaseClient().from("customer_profiles").upsert({
    user_id: user.id, email: user.email, full_name: address.fullName, phone: address.phone,
    address_line_1: address.addressLine1, address_line_2: address.addressLine2, city: address.city,
    state: address.state, postal_code: address.postalCode, country: address.country, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (result.error) throw new Error("The customer profile could not be saved.");
}
