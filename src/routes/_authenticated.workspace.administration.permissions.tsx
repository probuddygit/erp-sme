import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { useSettingsDoc, useSaveSettingsDoc } from "@/features/admin/admin-api";
import { ROLE_OPTIONS } from "@/features/admin/roles";

export const Route = createFileRoute("/_authenticated/workspace/administration/permissions")({
  component: PermsPage,
});

interface Perm { key: string; module: string; action: string; description: string | null }

function PermsPage() {
  const [role, setRole] = useState("admin");
  const { value, isLoading } = useSettingsDoc<Record<string, string[]>>("admin.role_permissions", {});
  const save = useSaveSettingsDoc("admin.role_permissions");
  const [draft, setDraft] = useState<Record<string, string[]> | null>(null);

  const { data: perms = [] } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("key, module, action, description").order("module");
      if (error) throw error;
      return (data ?? []) as Perm[];
    },
  });

  const defaultsFor = (r: string) =>
    r === "admin" || r === "owner" || r === "super_admin"
      ? perms.map((p) => p.key)
      : perms.filter((p) => p.module === r || p.module === "dashboard").map((p) => p.key);

  const map = draft ?? value;
  const granted = new Set(map[role] ?? defaultsFor(role));

  const toggle = (key: string) => {
    const next = new Set(granted);
    next.has(key) ? next.delete(key) : next.add(key);
    setDraft({ ...map, [role]: [...next] });
  };

  const modules = [...new Set(perms.map((p) => p.module))];
  const actions = [...new Set(perms.map((p) => p.action))];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{granted.size} of {perms.length} permissions granted</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setDraft({ ...map, [role]: defaultsFor(role) })}>
              <RotateCcw className="mr-1.5 h-4 w-4" />Reset to default
            </Button>
            <Button onClick={() => save.mutate(map)} disabled={save.isPending || isLoading}>
              <Save className="mr-1.5 h-4 w-4" />{save.isPending ? "Saving…" : "Save permissions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Module</th>
                {actions.map((a) => <th key={a} className="px-4 py-2.5 text-center font-medium">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium capitalize">{m}</td>
                  {actions.map((a) => {
                    const p = perms.find((x) => x.module === m && x.action === a);
                    return (
                      <td key={a} className="px-4 py-2.5 text-center">
                        {p ? (
                          <Checkbox checked={granted.has(p.key)} onCheckedChange={() => toggle(p.key)} />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
