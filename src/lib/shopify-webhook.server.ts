/**
 * Server-only: Shopify order webhooks → Supabase (HMAC + service role).
 * Never import this from client components; only via dynamic import in server handlers.
 */

export type ShopifyOrderPayload = {
  id?: number | string;
  admin_graphql_api_id?: string;
  order_number?: number;
  name?: string;
  email?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  note?: string | null;
  currency?: string;
  presentment_currency?: string;
  subtotal_price?: string;
  current_subtotal_price?: string;
  total_price?: string;
  current_total_price?: string;
  total_discounts?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  customer?: { first_name?: string; last_name?: string } | null;
  billing_address?: { name?: string; phone?: string | null } | null;
  shipping_address?: {
    name?: string;
    phone?: string | null;
    address1?: string;
    address2?: string | null;
    city?: string;
    province?: string;
    province_code?: string;
    zip?: string;
  } | null;
  shipping_lines?: Array<{ price?: string }>;
  line_items?: Array<{ title?: string; name?: string; price?: string; quantity?: number }>;
};

function money(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sumShipping(lines: Array<{ price?: string }> | undefined) {
  if (!lines?.length) return 0;
  return lines.reduce((s, l) => s + money(l.price), 0);
}

function mapOrderStatus(
  financial: string | null | undefined,
  fulfillment: string | null | undefined,
) {
  if (financial === "paid" || financial === "partially_paid") return "pago";
  if (fulfillment === "fulfilled") return "enviado";
  if (financial === "refunded" || financial === "voided") return "cancelado";
  return "pendente";
}

function bytesToBase64(bytes: ArrayBuffer) {
  const u8 = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]!);
  return btoa(binary);
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyShopifyHmac(rawBody: ArrayBuffer, hmacHeader: string, secret: string) {
  if (!hmacHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, rawBody);
  return timingSafeEqualStr(bytesToBase64(sig), hmacHeader);
}

export async function handleShopifyOrdersWebhook(request: Request): Promise<Response> {
  const secret = process.env["SHOPIFY_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[shopify-webhook] SHOPIFY_WEBHOOK_SECRET ausente");
    return new Response("Misconfigured", { status: 500 });
  }

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const rawBody = await request.arrayBuffer();

  if (!(await verifyShopifyHmac(rawBody, hmacHeader, secret))) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  let payload: ShopifyOrderPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody)) as ShopifyOrderPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const externalId = String(payload.admin_graphql_api_id ?? payload.id ?? "");
  if (!externalId) {
    return new Response("Missing order id", { status: 400 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const subtotal = money(payload.subtotal_price ?? payload.current_subtotal_price);
  const shipping = sumShipping(payload.shipping_lines);
  const discount = money(payload.total_discounts);
  const total = money(payload.total_price ?? payload.current_total_price);
  const currency = payload.currency ?? payload.presentment_currency ?? "BRL";
  const email = payload.email ?? payload.contact_email ?? null;
  const phone =
    payload.phone ?? payload.billing_address?.phone ?? payload.shipping_address?.phone ?? null;
  const name =
    [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(" ").trim() ||
    payload.billing_address?.name ||
    "Cliente Shopify";

  const ship = payload.shipping_address;
  const orderRow = {
    source: "shopify" as const,
    external_order_id: externalId,
    code: `SH-${payload.order_number ?? payload.name ?? payload.id}`,
    customer_name: name.slice(0, 120),
    customer_phone: (phone ?? "n/a").slice(0, 30),
    customer_email: email,
    zip_code: (ship?.zip ?? "00000000").slice(0, 12),
    street: (ship?.address1 ?? "—").slice(0, 160),
    number: (ship?.address2 ?? "S/N").slice(0, 20),
    complement: ship?.address2 ?? null,
    district: (ship?.city ?? "—").slice(0, 120),
    city: (ship?.city ?? "—").slice(0, 120),
    state: (ship?.province_code ?? ship?.province ?? "—").slice(0, 2),
    payment_method: "shopify",
    payment_status: payload.financial_status ?? null,
    financial_status: payload.financial_status ?? null,
    fulfillment_status: payload.fulfillment_status ?? "unfulfilled",
    currency,
    subtotal,
    shipping_fee: shipping,
    discount_total: discount,
    total,
    notes: payload.note ?? null,
    status: mapOrderStatus(payload.financial_status, payload.fulfillment_status),
  };

  const { data: upserted, error: orderErr } = await supabaseAdmin
    .from("orders")
    .upsert(orderRow, { onConflict: "external_order_id" })
    .select("id")
    .single();

  if (orderErr || !upserted) {
    console.error("[shopify-webhook] order upsert", orderErr);
    return new Response("Order upsert failed", { status: 500 });
  }

  await supabaseAdmin.from("order_items").delete().eq("order_id", upserted.id);

  const lines = (payload.line_items ?? []).map((li) => ({
    order_id: upserted.id,
    product_id: null,
    product_name: (li.title ?? li.name ?? "Item").slice(0, 200),
    unit_price: money(li.price),
    quantity: Math.max(1, Number(li.quantity) || 1),
  }));

  if (lines.length) {
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(lines);
    if (itemsErr) {
      console.error("[shopify-webhook] items insert", itemsErr);
      return new Response("Items insert failed", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ ok: true, id: upserted.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
