import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, X, Send, MessageCircle, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productsQuery, formatPrice } from "@/lib/products";
import {
  answerWithAssistant,
  getWelcomeMessage,
  type ChatMessage,
} from "@/lib/ai-assistant";
import { useAddToCart } from "@/hooks/useAddToCart";


export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: products } = useQuery(productsQuery);
  const { addToCart, isLoading: cartLoading } = useAddToCart();

  async function addAll(list: NonNullable<ChatMessage["products"]>, key: string, goCheckout: boolean) {
    setBulkAction(key);
    try {
      let added = 0;
      for (const p of list) {
        const ok = await addToCart(p.slug, p.name, 1);
        if (ok) added += 1;
      }
      if (added > 0 && goCheckout) {
        setOpen(false);
        navigate({ to: "/checkout" });
      }
    } finally {
      setBulkAction(null);
    }
  }


  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Reprocessa a última pergunta do usuário quando o catálogo termina de carregar.
  useEffect(() => {
    const catalog = products ?? [];
    if (catalog.length === 0 || messages.length < 2) return;
    const last = messages[messages.length - 1];
    const secondLast = messages[messages.length - 2];
    if (
      last &&
      secondLast &&
      last.role === "assistant" &&
      secondLast.role === "user" &&
      last.content.includes("Ainda não entendi bem")
    ) {
      const reply = answerWithAssistant(secondLast.content, catalog);
      if (!reply.content.includes("Ainda não entendi bem")) {
        setMessages((prev) => [...prev.slice(0, -1), reply]);
      }
    }
  }, [products]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const catalog = products ?? [];
      if (catalog.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Estou carregando o catálogo de produtos. Envie sua pergunta novamente em alguns segundos, por favor.",
          },
        ]);
        setTyping(false);
        return;
      }
      const reply = answerWithAssistant(text, catalog);
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
    }, 600);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Abrir assistente virtual"
        >
          <Bot className="size-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Assistente Tioxtm Natural</p>
                <p className="text-[10px] opacity-80">Responde com base no catálogo</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-primary-foreground/10"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex h-[420px] flex-col gap-3 overflow-y-auto bg-background/50 p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex max-w-[85%] flex-col gap-2 ${
                  m.role === "user" ? "self-end" : "self-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md text-foreground"
                  }`}
                >
                  {m.content}
                </div>

                {m.products && m.products.length > 0 && (
                  <div className="grid gap-2">
                    {m.products.map((p) => (
                      <div
                        key={p.id}
                        className="surface-card flex items-center gap-3 p-2 pr-3"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-12 rounded-lg bg-sand object-contain"
                          />
                        ) : (
                          <div
                            className="size-12 rounded-lg"
                            style={{
                              background: `linear-gradient(160deg, ${p.jar_color}, ${p.lid_color})`,
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            disabled={cartLoading}
                            onClick={() => addToCart(p.slug, p.name, 1)}
                            aria-label={`Adicionar ${p.name} ao carrinho`}
                          >
                            <ShoppingCart className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link to="/produtos/$slug" params={{ slug: p.slug }}>
                              <MessageCircle className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={cartLoading || bulkAction !== null}
                        onClick={() => addAll(m.products!, `add-${i}`, false)}
                      >
                        {bulkAction === `add-${i}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="size-3.5" /> Adicionar todos
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={cartLoading || bulkAction !== null}
                        onClick={() => addAll(m.products!, `buy-${i}`, true)}
                      >
                        {bulkAction === `buy-${i}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Comprar agora"
                        )}
                      </Button>
                    </div>
                  </div>
                )}


                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="self-start rounded-2xl rounded-bl-md bg-card px-4 py-3 text-sm text-muted-foreground">
                <span className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit" size="icon" className="h-9 w-9 rounded-full">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
