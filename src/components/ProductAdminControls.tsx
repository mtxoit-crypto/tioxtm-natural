import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { moveProduct, type Product } from "@/lib/products";
import { setProductProfileImage } from "@/lib/media";
import { Button } from "@/components/ui/button";

export function ProductAdminControls({
  product,
  products,
}: {
  product: Product;
  products: Product[];
}) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const move = useMutation({
    mutationFn: (direction: -1 | 1) => moveProduct(products, product.id, direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const cover = useMutation({
    mutationFn: (file: File) => setProductProfileImage(product.id, file),
    onSuccess: () => {
      toast.success("Foto de perfil atualizada");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-media", product.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  const index = [...products]
    .sort((a, b) => a.sort_order - b.sort_order)
    .findIndex((p) => p.id === product.id);

  return (
    <div
      className="absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-1"
      onClick={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1 rounded-full bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={index <= 0 || move.isPending}
          aria-label="Mover para a esquerda"
          onClick={() => move.mutate(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={index < 0 || index >= products.length - 1 || move.isPending}
          aria-label="Mover para a direita"
          onClick={() => move.mutate(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="flex gap-1 rounded-full bg-background/90 p-1 shadow-sm backdrop-blur">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) cover.mutate(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={cover.isPending}
          aria-label="Trocar foto de perfil"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="size-8" asChild>
          <Link to="/admin" aria-label="Editar no painel">
            <Pencil className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
