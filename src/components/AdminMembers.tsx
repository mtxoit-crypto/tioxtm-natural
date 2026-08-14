import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { addMember, membersQuery, removeMember, type Member } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminMembers() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const { data: members } = useQuery(membersQuery);

  const add = useMutation({
    mutationFn: () => addMember(email),
    onSuccess: (status) => {
      toast.success(
        status === "ativo"
          ? "Sócio adicionado com acesso total ao painel"
          : "Convite salvo — o acesso libera assim que a pessoa criar a conta com esse e-mail",
      );
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (m: Member) => removeMember(m),
    onSuccess: () => {
      toast.success("Acesso removido");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card mt-8 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h2 className="text-xl">Sócios e permissões</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Sócios têm as mesmas permissões que você: cadastrar e editar produtos, enviar fotos, vídeos e
        modelos 3D, ver e atualizar pedidos e ajustar as configurações da loja.
      </p>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) add.mutate();
        }}
      >
        <Input
          type="email"
          required
          placeholder="e-mail do sócio"
          value={email}
          className="max-w-xs"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={add.isPending}>
          <UserPlus className="size-4" />
          Adicionar sócio
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        {(members ?? []).map((m) => (
          <div
            key={`${m.user_id ?? "invite"}-${m.email}`}
            className="flex items-center gap-3 rounded-lg bg-sand px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">{m.display_name ?? m.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.email} ·{" "}
                {m.is_owner
                  ? "dono da loja"
                  : m.status === "convidado"
                    ? "convite pendente"
                    : "sócio administrador"}
              </p>
            </div>
            {m.is_owner ? (
              <span className="text-xs text-muted-foreground">acesso permanente</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(m)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
