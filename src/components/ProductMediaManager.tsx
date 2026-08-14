import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  productMediaQuery,
  uploadProductMedia,
  deleteProductMedia,
  setCoverFromMedia,
  setProductProfileImage,
  type ProductMedia,
} from "@/lib/media";
import { Button } from "@/components/ui/button";

export function ProductMediaManager({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: media } = useQuery(productMediaQuery(productId));

  const remove = useMutation({
    mutationFn: (m: ProductMedia) => deleteProductMedia(m),
    onSuccess: () => {
      toast.success("Arquivo removido");
      qc.invalidateQueries({ queryKey: ["product-media", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cover = useMutation({
    mutationFn: (m: ProductMedia) => setCoverFromMedia(productId, m),
    onSuccess: () => {
      toast.success("Definida como foto de perfil");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFiles(files: FileList | null, asCover = false) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name}: máximo de 50 MB por arquivo`);
          continue;
        }
        if (asCover && file.type.startsWith("image")) {
          await setProductProfileImage(productId, file);
        } else {
          await uploadProductMedia(productId, file);
        }
      }
      toast.success(asCover ? "Foto de perfil atualizada" : "Mídia enviada");
      qc.invalidateQueries({ queryKey: ["product-media", productId] });
      if (asCover) qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.glb,.gltf,model/gltf-binary"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Enviar fotos, vídeos ou modelo 3D
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = () => onFiles(input.files, true);
          input.click();
        }}
      >
        <Star className="size-4" />
        Trocar foto de perfil do produto
      </Button>
      <p className="text-xs text-muted-foreground">
        Do PC ou do celular (a câmera abre direto no celular). A foto de perfil aparece no catálogo
        e na página do produto. Até 50 MB por arquivo.
      </p>

      {media && media.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-lg bg-sand">
              {m.media_type === "model" ? (
                <div className="flex aspect-square items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                  Modelo 3D
                </div>
              ) : m.media_type === "video" ? (
                <video src={m.url} className="size-full aspect-square object-cover" muted />
              ) : (
                <img src={m.url} alt={m.alt ?? ""} className="size-full aspect-square object-cover" />
              )}
              {m.media_type === "image" ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-1 top-1 size-6 bg-background/80"
                  title="Usar como foto de perfil"
                  onClick={() => cover.mutate(m)}
                >
                  <Star className="size-3" />
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 size-6 bg-background/80"
                onClick={() => remove.mutate(m)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
