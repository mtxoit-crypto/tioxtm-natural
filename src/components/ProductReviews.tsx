import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { reviewsQuery, submitReview, averageRating } from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data: reviews } = useQuery(reviewsQuery(productId));
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const send = useMutation({
    mutationFn: () => submitReview({ product_id: productId, author_name: name, rating, comment }),
    onSuccess: () => {
      toast.success("Obrigado pela sua avaliação!");
      setName("");
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = averageRating(reviews);

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Avaliações</h2>
        {avg != null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={avg} />
            <span>
              {avg.toFixed(1)} · {reviews?.length} avaliação{(reviews?.length ?? 0) > 1 ? "ões" : ""}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {reviews?.length ? (
            reviews.map((r) => (
              <article key={r.id} className="surface-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.author_name}</p>
                  <Stars value={r.rating} size={14} />
                </div>
                {r.comment ? <p className="mt-2 text-sm leading-relaxed">{r.comment}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </article>
            ))
          ) : (
            <p className="text-muted-foreground">
              Ainda não há avaliações. Seja o primeiro a avaliar este produto.
            </p>
          )}
        </div>

        <form
          className="surface-card h-fit space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2) {
              toast.error("Informe seu nome");
              return;
            }
            send.mutate();
          }}
        >
          <h3 className="text-lg">Deixe sua avaliação</h3>
          <div className="space-y-1.5">
            <Label>Sua nota</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i} estrelas`}
                  onClick={() => setRating(i)}
                  className="p-1"
                >
                  <Star
                    className={`size-6 ${i <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-name">Nome</Label>
            <Input
              id="review-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">Comentário</Label>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi sua experiência com o produto"
            />
          </div>
          <Button type="submit" className="w-full" disabled={send.isPending}>
            Enviar avaliação
          </Button>
        </form>
      </div>
    </section>
  );
}
