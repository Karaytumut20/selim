import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function serverFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: serverFetch },
  });
}

export function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is incomplete.");

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: serverFetch },
  });
}

export function getProductImagesPublicUrl(path: string) {
  const url = process.env.SUPABASE_URL;
  if (!url) return "";
  return `${url}/storage/v1/object/public/product-images/${path.split("/").map(encodeURIComponent).join("/")}`;
}
