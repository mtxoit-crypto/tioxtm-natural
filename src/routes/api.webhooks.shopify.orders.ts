import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/shopify/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleShopifyOrdersWebhook } = await import("@/lib/shopify-webhook.server");
        return handleShopifyOrdersWebhook(request);
      },
    },
  },
});
