import { notFound, redirect } from "next/navigation";
import { TestOrderActions } from "../../../components/test-order-actions";
import { getAdminAccess } from "../../../lib/admin-auth";
import { testCheckoutEnabled } from "../../../lib/customer-auth";
import { createAdminSupabaseClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test order administration", robots: { index: false, follow: false } };

export default async function TestOrderAdmin() {
  if (!testCheckoutEnabled()) notFound();
  const access = await getAdminAccess();
  if (!access.user) redirect("/admin/login");
  if (!access.allowed) notFound();
  const { data, error } = await createAdminSupabaseClient().from("orders")
    .select("id,order_number,status,payment_status,shipping_status").like("order_number", "QA-%")
    .order("created_at", { ascending: false }).limit(50);
  return <main className="content-section"><div className="container">
    <h1>Test orders</h1>
    <p>Processes sandbox orders and sends email only to the configured test address.</p>
    <TestOrderActions />
    {error ? <p role="alert">Test orders could not be loaded.</p> :
      !data.length ? <p>No test orders have been submitted.</p> :
      <ul>{data.map((order) => <li key={order.id}>
        <strong>{order.order_number}</strong> · {order.status} · {order.payment_status} · {order.shipping_status}
        {process.env.ENABLE_TEST_LABELS === "true" && order.status === "ready_to_ship" && <TestOrderActions orderId={order.id} />}
      </li>)}</ul>}
  </div></main>;
}
