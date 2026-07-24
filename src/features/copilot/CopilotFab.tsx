import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X, ShoppingCart, TrendingUp, PackageX, Wallet, Truck, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  { label: "Create Sales Order",   prompt: "Create a new Sales Order for Ashok Industries with 10 units of Steel Rod 12mm.", icon: ShoppingCart },
  { label: "Show Today's Sales",   prompt: "Show me today's sales summary by branch.",                                        icon: TrendingUp },
  { label: "Low Stock",            prompt: "List items below reorder level across warehouses.",                               icon: PackageX },
  { label: "Outstanding Payments", prompt: "Show outstanding customer payments aged > 30 days.",                              icon: Wallet },
  { label: "Open Purchase Orders", prompt: "List open purchase orders pending GRN.",                                          icon: Truck },
];

const CANNED_REPLY =
  "I'm your ERP Copilot. Once a language model is connected, I'll draft documents, query your data and automate flows across Sales, Procurement, Inventory, Finance and GST. For now, this is a UI preview.";

export function CopilotFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "assistant", text: "Hi! I'm your Ind Guru Copilot. Ask me anything about your ERP — try a suggestion below." },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: "user", text: t },
      { id: `a${Date.now() + 1}`, role: "assistant", text: CANNED_REPLY },
    ]);
    setInput("");
  };

  return (
    <>
      <button
        aria-label="Open Copilot"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform hover:scale-105",
          open && "scale-95",
        )}
        style={{ background: "var(--gradient-accent)" }}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-foreground shadow">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[80vh] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Ind Guru Copilot</div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                UI preview · model not connected
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-muted" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-border p-3">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Wand2 className="h-3 w-3" />
                Try
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
                  >
                    <s.icon className="h-3 w-3 text-muted-foreground" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot anything…"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}