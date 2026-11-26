"use client";

import { useState } from "react";

type ActionResult = {
  error?: string; labels?: Array<{ labelUrl: string; trackingNumber: string }>;
  configured?: boolean; accepted?: number; needsReview?: number;
};

export function TestOrderActions({ orderId }: { orderId?: string }) {
  const [result, setResult] = useState<ActionResult>();
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    setResult(undefined);
    try {
      const url = orderId ? `/api/admin/test-orders/${encodeURIComponent(orderId)}/labels` : "/api/admin/notifications";
      const response = await fetch(url, { method: "POST" });
      const body = await response.json() as ActionResult;
      setResult(response.ok ? body : { error: body.error || "Test action could not be completed." });
    } catch {
      setResult({ error: "Result unknown. Check the provider before attempting again." });
    } finally {
      setPending(false);
    }
  }
  return <div>
    <button className="button button-secondary" type="button" onClick={() => void run()} disabled={pending}>
      {pending ? "Working…" : orderId ? "Create or retrieve test labels" : "Process test email queue"}
    </button>
    {result?.error && <p role="alert">{result.error}</p>}
    {result && !result.error && !orderId && <p role="status">
      {result.configured ? `${result.accepted ?? 0} accepted by Brevo. ${result.needsReview ?? 0} need review.` : "Test email is disabled."}
    </p>}
    {result?.labels?.map((label) =>
      <a key={label.trackingNumber} href={label.labelUrl} target="_blank" rel="noopener noreferrer">Test label {label.trackingNumber}</a>,
    )}
  </div>;
}
