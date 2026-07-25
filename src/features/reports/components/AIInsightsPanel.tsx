import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Bot, TrendingDown, TrendingUp, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AI_SUGGESTIONS, AI_CANNED_INSIGHTS } from "../data";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const REPLIES = [
  "Based on the last 6 months of data, revenue is trending +8.4% YoY with a soft patch in August driven by the Karnataka region and Bearings category.",
  "12 SKUs show zero movement > 120 days totalling ₹18.4L. Suggested actions: liquidation pricing on 4, BOM substitution on 3, review the remaining 5.",
  "Next-month baseline forecast is ₹1.42Cr (±6%). Confirmed pipeline: ₹92L. Unconfirmed: ₹57L weighted at 62%.",
  "Top-5 profitable customers contribute 62% of gross margin: Ashok Industries, Chola Motors, Fortis Auto, Indus Foundry, Bharat Steel.",
  "Executive summary drafted. Revenue ₹8.6Cr YTD, GM 22.1%, Cash ₹1.4Cr, AR>60d ₹19.2L. Full narrative available on export.",
];

export function AIInsightsPanel({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "assistant", text: "Hi — I'm your Reports AI. Ask a question about your business or pick a suggestion below." },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const id = String(Date.now());
    setMessages((m) => [...m, { id, role: "user", text }]);
    setInput("");
    const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
    setTimeout(() => {
      setMessages((m) => [...m, { id: id + "r", role: "assistant", text: reply }]);
    }, 600);
  };

  return (
    <div className={cn("grid gap-4", variant === "page" && "lg:grid-cols-[1fr_360px]")}>
      {variant === "page" && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">Recent insights</div>
          {AI_CANNED_INSIGHTS.map((i, idx) => {
            const Icon = i.tone === "success" ? TrendingUp : i.tone === "danger" ? TrendingDown : AlertTriangle;
            const tone =
              i.tone === "success" ? "text-emerald-600 bg-emerald-500/10" :
              i.tone === "danger" ? "text-rose-600 bg-rose-500/10" :
              "text-amber-600 bg-amber-500/10";
            return (
              <div key={idx} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{i.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Analytics Assistant</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Preview · UI only</div>
          </div>
        </div>
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {AI_SUGGESTIONS.slice(0, variant === "page" ? 5 : 4).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about revenue, stock, cash, forecasts…"
              className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
            />
            <Button type="submit" size="sm" className="h-7 px-2"><Send className="h-3.5 w-3.5" /></Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Floating quick-access AI panel usable from any report page.
export function AIInsightsFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700"
        title="Ask Analytics AI"
      >
        <Sparkles className="h-4 w-4" /> AI Insights
      </button>
      {open && (
        <div className="fixed bottom-40 right-6 z-40 w-[380px] max-w-[calc(100vw-1.5rem)]">
          <div className="relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-2 -right-2 z-10 rounded-full border border-border bg-background p-1 shadow"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <AIInsightsPanel variant="drawer" />
          </div>
        </div>
      )}
    </>
  );
}