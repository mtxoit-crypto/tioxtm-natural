/**
 * Testa o handler buildado com mock local de Supabase (zero escrita em produção).
 */
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tmp = join(root, ".tmp-webhook-smoke");
const SECRET = "smoke-test-webhook-secret";
process.env.SHOPIFY_WEBHOOK_SECRET = SECRET;

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const orders = new Map();
const itemsByOrder = new Map();
let seq = 1;

const mockClient = `
const orders = globalThis.__SMOKE_ORDERS__;
const itemsByOrder = globalThis.__SMOKE_ITEMS__;
let seq = globalThis.__SMOKE_SEQ__;
export const supabaseAdmin = {
  from(table) {
    if (table === "orders") {
      return {
        upsert(row) {
          return {
            select() {
              return {
                async single() {
                  const key = row.external_order_id;
                  let existing = [...orders.values()].find((o) => o.external_order_id === key);
                  if (existing) {
                    Object.assign(existing, row);
                    return { data: { id: existing.id }, error: null };
                  }
                  const id = "ord-" + (seq++);
                  globalThis.__SMOKE_SEQ__ = seq;
                  orders.set(id, { id, ...row });
                  return { data: { id }, error: null };
                },
              };
            },
          };
        },
      };
    }
    if (table === "order_items") {
      return {
        delete() {
          return {
            async eq(_c, orderId) {
              itemsByOrder.set(orderId, []);
              return { error: null };
            },
          };
        },
        async insert(lines) {
          const orderId = lines[0]?.order_id;
          itemsByOrder.set(orderId, lines);
          return { error: null };
        },
      };
    }
    throw new Error("unexpected " + table);
  },
};
`;

globalThis.__SMOKE_ORDERS__ = orders;
globalThis.__SMOKE_ITEMS__ = itemsByOrder;
globalThis.__SMOKE_SEQ__ = seq;

writeFileSync(join(tmp, "client.server-CGmxxKna.mjs"), mockClient);
copyFileSync(
  join(root, ".output/server/_ssr/shopify-webhook.server-8w9uWdsn.mjs"),
  join(tmp, "shopify-webhook.server.mjs"),
);

// Patch import path stays relative ./client.server-CGmxxKna.mjs — already matches

const { handleShopifyOrdersWebhook } = await import(
  pathToFileURL(join(tmp, "shopify-webhook.server.mjs")).href
);

function sign(body) {
  return createHmac("sha256", SECRET).update(body).digest("base64");
}

const payload = {
  id: 900001,
  admin_graphql_api_id: "gid://shopify/Order/SMOKE_TEST_DO_NOT_PERSIST",
  order_number: 900001,
  total_price: "10.00",
  financial_status: "paid",
  email: "smoke@example.com",
  shipping_address: {
    address1: "Rua A",
    city: "SP",
    province_code: "SP",
    zip: "01000-000",
  },
  line_items: [
    { title: "Smoke A", quantity: 1, price: "5.00" },
    { title: "Smoke B", quantity: 2, price: "2.50" },
  ],
};
const raw = JSON.stringify(payload);

async function post(hmac) {
  const req = new Request("http://local/api/webhooks/shopify/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-hmac-sha256": hmac,
    },
    body: raw,
  });
  const res = await handleShopifyOrdersWebhook(req);
  return { status: res.status, body: await res.text() };
}

const bad = await post("bad");
const good1 = await post(sign(raw));
const good2 = await post(sign(raw));
const id1 = (() => {
  try {
    return JSON.parse(good1.body).id;
  } catch {
    return null;
  }
})();
const id2 = (() => {
  try {
    return JSON.parse(good2.body).id;
  } catch {
    return null;
  }
})();

const summary = {
  invalid_status: bad.status,
  valid1_status: good1.status,
  valid2_status: good2.status,
  orders: orders.size,
  items: itemsByOrder.get(id1)?.length ?? 0,
  same_id: id1 != null && id1 === id2,
  hmac_invalid_ok: bad.status === 401,
  hmac_valid_ok: good1.status === 200 && good2.status === 200,
  idempotency_ok: orders.size === 1 && id1 === id2,
  items_no_dup_ok: (itemsByOrder.get(id1)?.length ?? 0) === 2,
  production_writes: false,
};

console.log(JSON.stringify(summary, null, 2));
rmSync(tmp, { recursive: true, force: true });
process.exit(
  summary.hmac_invalid_ok &&
    summary.hmac_valid_ok &&
    summary.idempotency_ok &&
    summary.items_no_dup_ok
    ? 0
    : 1,
);
