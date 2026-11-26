"use client";

import { useRef, useState, type FormEvent } from "react";

type Product = { id: string; name: string; price: number; stockQuantity: number };
type Customer = { fullName: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string };
type Order = { id: string; orderNumber: string; status: string; paymentStatus: string; total: number | null };

const fields = [
  ["customerName", "Full name", "fullName"], ["phone", "Phone", "phone"], ["addressLine1", "Address", "addressLine1"],
  ["addressLine2", "Address line 2", "addressLine2"], ["city", "City", "city"], ["state", "State", "state"],
  ["postalCode", "ZIP code", "postalCode"],
] as const;
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function CheckoutClient({ products, customer, cardEnabled, initialOrders }: { products: Product[]; customer: Customer; cardEnabled: boolean; initialOrders: Order[] }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const attempt = useRef<{ body: string; key: string } | null>(null);

  async function loadOrders() {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (response.ok) setOrders(((await response.json()) as { orders: Order[] }).orders);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const { productId, quantity, ...details } = data;
    const body = JSON.stringify({ ...details, country: "US", items: [{ productId, quantity: Number(quantity) }] });
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key }, body,
      });
      const result = await response.json() as { error?: string; checkoutUrl?: string; order?: Order };
      if (!response.ok) throw new Error(result.error || "Test order could not be submitted.");
      if (result.checkoutUrl) {
        const stripe = new URL(result.checkoutUrl);
        if (stripe.origin !== "https://checkout.stripe.com") throw new Error("The test payment link could not be verified.");
        window.location.assign(stripe);
        return;
      }
      if (!result.order) throw new Error("The order response is incomplete. Check order history.");
      setMessage(`Test order ${result.order.orderNumber} was submitted for invoice review.`);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The checkout result is unknown. Check order history before retrying.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <p>Use test data only. Card checkout accepts Stripe test cards.</p>
    {products.length ? <form className="admin-form-grid" onSubmit={submit}>
      <label>Product <select name="productId" required>{products.map((product) =>
        <option key={product.id} value={product.id}>{product.name} · {dollars(product.price)} · {product.stockQuantity} available</option>,
      )}</select></label>
      <label>Quantity <input name="quantity" type="number" min="1" max="8" defaultValue="1" required /></label>
      {fields.map(([name, label, key]) =>
        <label key={name}>{label}<input name={name} defaultValue={customer[key]} required={name !== "addressLine2"} /></label>,
      )}
      <label>Payment
        <select name="paymentMethod"><option value="invoice">Invoice review</option>{cardEnabled && <option value="stripe">Stripe test card</option>}</select>
      </label>
      <label>Coupon <input name="couponCode" maxLength={32} /></label>
      <div className="admin-form-wide">
        <button className="button button-primary" disabled={pending}>{pending ? "Submitting…" : "Submit test order"}</button>
      </div>
    </form> : <p>No published products with a price and available stock were found.</p>}
    {message && <p role="status">{message}</p>}
    <h2>Test order history</h2>
    <button className="button button-secondary" type="button" onClick={() => void loadOrders().catch(() => setMessage("Order history could not be refreshed."))}>Refresh orders</button>
    {orders.length > 0 && <ul>{orders.map((order) =>
      <li key={order.id}>{order.orderNumber} · {order.status} · {order.paymentStatus}{order.total !== null && ` · ${dollars(order.total)}`}</li>,
    )}</ul>}
  </>;
}
