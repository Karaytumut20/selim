import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "./supabase/server";

export async function logOperation(entry: { type: string; severity: string; referenceId?: string; message: string; status?: string; payload?: unknown }) {
  const { error } = await createAdminSupabaseClient().from("operations_events").insert({
    id: randomUUID(), type: entry.type, severity: entry.severity, reference_id: entry.referenceId,
    status: entry.status, message: entry.message.slice(0, 800), payload: entry.payload,
  });
  if (error) throw new Error("Operation could not be recorded.");
}
