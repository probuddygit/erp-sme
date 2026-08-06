import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFlows } from "@/features/workflow/workflow-api";
import { NODE_PALETTE, SAMPLE_NODES, paletteByKind, type CanvasNode, type NodeKind } from "@/features/workflow/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Trash2, Save, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NODE_W = 176;
const NODE_H = 68;

export function WorkflowDesigner({ flowId }: { flowId?: string }) {
  const navigate = useNavigate();
  const { rows: flows, isLoading, replaceAll } = useFlows();
  const current = flows.find((f) => f.id === flowId) ?? null;

  const [nodes, setNodes] = useState<CanvasNode[]>(SAMPLE_NODES);
  const [name, setName] = useState("New workflow");
  const [status, setStatus] = useState("Draft");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadedKey, setLoadedKey] = useState<string>("");

  // hydrate the editor when the selected flow changes
  const key = `${flowId ?? "new"}-${isLoading ? "l" : "r"}`;
  if (key !== loadedKey && !isLoading) {
    setLoadedKey(key);
    setNodes(current?.nodes?.length ? current.nodes : SAMPLE_NODES);
    setName(current?.name ?? "New workflow");
    setStatus(current?.status ?? "Draft");
  }

  const selectFlow = (id: string) => navigate({ to: "/workspace/workflow/designer", search: id === "__new" ? {} : { flow: id } });

  const saveFlow = async () => {
    const id = flowId ?? crypto.randomUUID();
    const row = { id, name, status, nodes, updated_at: new Date().toISOString() };
    const next = flows.some((f) => f.id === id) ? flows.map((f) => (f.id === id ? { ...f, ...row } : f)) : [...flows, row];
    await replaceAll(next as any);
    toast.success("Workflow saved");
    if (!flowId) navigate({ to: "/workspace/workflow/designer", search: { flow: id } });
  };

  const deleteFlow = async () => {
    if (!flowId) return;
    await replaceAll(flows.filter((f) => f.id !== flowId) as any);
    toast.success("Workflow deleted");
    navigate({ to: "/workspace/workflow/designer", search: {} });
  };

  const toggleActive = async () => {
    const next = status === "Active" ? "Draft" : "Active";
    setStatus(next);
    if (flowId) {
      await replaceAll(flows.map((f) => (f.id === flowId ? { ...f, status: next } : f)) as any);
    }
    toast.success(next === "Active" ? "Workflow activated" : "Workflow paused");
  };

  const testRun = () => {
    if (!nodes.length) { toast.error("Add nodes before running a test"); return; }
    toast.success(`Test run simulated — ${nodes.length} steps executed`);
  };

  const aiSuggest = () => {
    const meta = paletteByKind("approval");
    const id = `n${Date.now()}`;
    setNodes((prev) => [...prev, { id, kind: "approval", label: "Suggested: Finance approval", x: 40 + prev.length * 40, y: 320 }]);
    setSelectedId(id);
    toast.success(`AI added a ${meta.label} step`);
  };
  const [selectedId, setSelectedId] = useState<string | null>("n2");
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const grouped = NODE_PALETTE.reduce<Record<string, typeof NODE_PALETTE>>((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});

  const onPaletteDragStart = (e: React.DragEvent, kind: NodeKind) => {
    e.dataTransfer.setData("application/x-node-kind", kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/x-node-kind") as NodeKind;
    if (!kind) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const meta = paletteByKind(kind);
    const id = `n${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      { id, kind, label: meta.label, x: e.clientX - rect.left - NODE_W / 2, y: e.clientY - rect.top - NODE_H / 2 },
    ]);
    setSelectedId(id);
  };

  const onNodeMouseDown = (e: React.MouseEvent, n: CanvasNode) => {
    setSelectedId(n.id);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragging({ id: n.id, ox: e.clientX - rect.left - n.x, oy: e.clientY - rect.top - n.y });
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragging.ox);
    const y = Math.max(0, e.clientY - rect.top - dragging.oy);
    setNodes((prev) => prev.map((n) => (n.id === dragging.id ? { ...n, x, y } : n)));
  };

  const onCanvasMouseUp = () => setDragging(null);

  const deleteSelected = () => {
    if (!selected) return;
    setNodes((prev) => prev.filter((n) => n.id !== selected.id));
    setSelectedId(null);
  };

  const updateLabel = (label: string) => {
    if (!selected) return;
    setNodes((prev) => prev.map((n) => (n.id === selected.id ? { ...n, label } : n)));
  };

  const connections = nodes.slice(0, -1).map((from, i) => ({ from, to: nodes[i + 1] }));

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
      <aside className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nodes</div>
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="mb-1.5 px-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">{group}</div>
              <div className="space-y-1.5">
                {items.map((p) => (
                  <div
                    key={p.kind}
                    draggable
                    onDragStart={(e) => onPaletteDragStart(e, p.kind)}
                    className={cn(
                      "flex cursor-grab items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors active:cursor-grabbing",
                      p.accent,
                    )}
                    title={p.description}
                  >
                    <p.icon className="h-3.5 w-3.5" />
                    <span className="font-medium">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={flowId ?? "__new"} onValueChange={selectFlow}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Select workflow" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">+ New workflow</SelectItem>
                {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-56 text-sm" />
            <button
              onClick={toggleActive}
              className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/70"
            >
              {status}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={aiSuggest}><Sparkles className="mr-1 h-3.5 w-3.5" />AI suggest</Button>
            <Button size="sm" variant="ghost" onClick={testRun}><Play className="mr-1 h-3.5 w-3.5" />Test run</Button>
            {flowId && <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteFlow}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>}
            <Button size="sm" onClick={saveFlow}><Save className="mr-1 h-3.5 w-3.5" />Save</Button>
          </div>
        </div>
        <div
          ref={canvasRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          className="relative h-[560px] w-full overflow-auto bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:16px_16px]"
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {connections.map(({ from, to }, i) => {
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            })}
          </svg>
          {nodes.map((n) => {
            const meta = paletteByKind(n.kind);
            const isSel = n.id === selectedId;
            return (
              <div
                key={n.id}
                onMouseDown={(e) => onNodeMouseDown(e, n)}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
                className={cn(
                  "absolute cursor-move rounded-lg border bg-card p-2.5 shadow-sm transition-shadow",
                  meta.accent,
                  isSel ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:shadow-md",
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  <meta.icon className="h-3 w-3" />
                  {meta.label}
                </div>
                <div className="mt-1 line-clamp-2 text-xs font-medium text-foreground">{n.label}</div>
              </div>
            );
          })}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Drag nodes here to start building
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</div>
        {!selected ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Select a node to configure
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <div className="mt-1 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                {paletteByKind(selected.kind).label}
              </div>
            </div>
            <div>
              <Label htmlFor="lbl" className="text-xs">Label</Label>
              <Input id="lbl" value={selected.label} onChange={(e) => updateLabel(e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="Describe this step…"
                value={notes[selected.id] ?? ""}
                onChange={(e) => setNotes((p) => ({ ...p, [selected.id]: e.target.value }))}
                className="mt-1 h-20 text-sm"
              />
            </div>
            <Separator />
            <Button variant="destructive" size="sm" className="w-full" onClick={deleteSelected}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />Delete node
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}