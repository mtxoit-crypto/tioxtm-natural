import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { adminReviewsQuery, deleteReview, setReviewApproved, type Review } from "@/lib/reviews";
import { Button } from "@/components/ui/button";

export function AdminReviews() {
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useQuery(adminReviewsQuery);

  const moderate = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) =>
      setReviewApproved(id, is_approved),
    onSuccess: (_, v) => {
      toast.success(v.is_approved ? "Avaliação aprovada" : "Avaliação reprovada");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["product-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Avaliação excluída");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["product-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card mt-8 p-6">
      <h2 className="text-2xl">Avaliações</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Novas avaliações entram como pendentes. Só as aprovadas aparecem na loja.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : !reviews?.length ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r: Review) => (
            <li key={r.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.author_name} · {r.rating}/5{" "}
                    <span className="text-xs text-muted-foreground">
                      {r.is_approved ? "aprovada" : "pendente"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.comment || "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")} · produto{" "}
                    {r.product_id.slice(0, 8)}…
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!r.is_approved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moderate.mutate({ id: r.id, is_approved: true })}
                    >
                      <Check className="size-4" /> Aprovar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => moderate.mutate({ id: r.id, is_approved: false })}
                    >
                      <X className="size-4" /> Reprovar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
