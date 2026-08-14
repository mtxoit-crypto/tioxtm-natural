import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";

type OrderItem = { product_name: string; quantity: number; unit_price: number };
type Order = {
  id: string;
  code: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  state: string;
  street: string;
  number: string;
  district: string;
  zip_code: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
};

const STATUSES = ["pendente", "pago", "enviado", "entregue", "cancelado", "teste"];

type AuditEntry = {
  id: string;
  order_code: string;
  customer_name: string | null;
  total: number;
  status: string | null;
  actor_email: string | null;
  created_at: string;
};

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos · Painel Tioxtm Natural" },
      { name: "description", content: "Acompanhe e atualize os pedidos da loja Tioxtm Natural." },
      { property: "og:title", content: "Pedidos · Painel Tioxtm Natural" },
      { property: "og:description", content: "Gestão de pedidos e status de entrega." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,code,status,customer_name,customer_phone,city,state,street,number,district,zip_code,total,created_at,order_items(product_name,quantity,unit_price)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    enabled: isAdmin,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", id);
      if (itemsError) throw itemsError;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido excluído");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-audit-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: auditLog } = useQuery({
    queryKey: ["order-audit-log"],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("order_audit_log")
        .select("id,order_code,customer_name,total,status,actor_email,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: isAdmin,
  });

  const testOrders = (orders ?? []).filter((o) => o.status === "teste");

  const removeTestOrders = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .in("order_id", ids);
      if (itemsError) throw itemsError;
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedidos de teste excluídos");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-audit-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="mx-auto max-w-6xl px-5 py-20">Carregando…</div>;
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <h1 className="text-3xl">Acesso restrito</h1>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={testOrders.length === 0 || removeTestOrders.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Excluir ${testOrders.length} pedido(s) com status "teste"? Essa ação não pode ser desfeita.`,
                )
              )
                removeTestOrders.mutate(testOrders.map((o) => o.id));
            }}
          >
            <Trash2 className="size-4" /> Excluir testes ({testOrders.length})
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Catálogo</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {(orders ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nenhum pedido ainda.</p>
        ) : null}
        {(orders ?? []).map((o) => (
          <div key={o.id} className="surface-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg">
                  {o.code} · {o.customer_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {o.customer_phone} · {o.street}, {o.number} — {o.district}, {o.city}/{o.state} ·
                  CEP {o.zip_code}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <p className="text-xl text-accent">{formatPrice(o.total)}</p>
            </div>

            <ul className="mt-3 text-sm text-muted-foreground">
              {(o.order_items ?? []).map((i, idx) => (
                <li key={idx}>
                  {i.quantity}x {i.product_name} — {formatPrice(i.unit_price * i.quantity)}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={o.status === s ? "default" : "outline"}
                  onClick={() => setStatus.mutate({ id: o.id, status: s })}
                >
                  {s}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                disabled={removeOrder.isPending}
                onClick={() => {
                  if (window.confirm(`Excluir o pedido ${o.code}? Essa ação não pode ser desfeita.`))
                    removeOrder.mutate(o.id);
                }}
              >
                <Trash2 className="size-4" /> Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">Log de exclusões</h2>
        <p className="text-sm text-muted-foreground">
          Registro de quem excluiu cada pedido e quando.
        </p>
        <div className="mt-4 space-y-2">
          {(auditLog ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma exclusão registrada.</p>
          ) : null}
          {(auditLog ?? []).map((entry) => (
            <div
              key={entry.id}
              className="surface-card flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
            >
              <span>
                <strong>{entry.order_code}</strong>
                {entry.customer_name ? ` · ${entry.customer_name}` : ""} ·{" "}
                {formatPrice(entry.total)}
                {entry.status ? ` · status ${entry.status}` : ""}
              </span>
              <span className="text-muted-foreground">
                excluído por {entry.actor_email ?? "desconhecido"} em{" "}
                {new Date(entry.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
