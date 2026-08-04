import { useState } from "react";
import { SettingsGrid, SettingsSection, FieldRow } from "./SettingsShell";
import { FieldInput, type AdminField } from "./CrudList";
import { Button } from "@/components/ui/button";
import { useSettingsDoc, useSaveSettingsDoc } from "./admin-api";
import { Save, RotateCcw } from "lucide-react";

export interface SettingsGroup {
  title: string;
  description?: string;
  fields: AdminField[];
}

export function SettingsForm({
  settingsKey, groups, footer, columns = 2,
}: { settingsKey: string; groups: SettingsGroup[]; footer?: React.ReactNode; columns?: 1 | 2 }) {
  const defaults: Record<string, any> = {};
  groups.forEach((g) => g.fields.forEach((f) => { defaults[f.name] = f.default ?? (f.type === "switch" ? false : ""); }));

  const { value, isLoading } = useSettingsDoc<Record<string, any>>(settingsKey, defaults);
  const save = useSaveSettingsDoc(settingsKey);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [syncKey, setSyncKey] = useState("");

  const loadedKey = isLoading ? "loading" : JSON.stringify(value);
  if (!isLoading && syncKey !== loadedKey && draft === null) {
    setSyncKey(loadedKey);
    setDraft(value);
  }
  const state = draft ?? value;
  const set = (k: string, v: any) => setDraft({ ...state, [k]: v });

  return (
    <div className="space-y-4">
      {columns === 2 ? (
        <SettingsGrid>
          {groups.map((g) => (
            <SettingsSection key={g.title} title={g.title} description={g.description}>
              {g.fields.map((f) => (
                <FieldRow key={f.name} label={f.label} hint={f.hint}>
                  <FieldInput field={f} value={state[f.name]} onChange={(v) => set(f.name, v)} />
                </FieldRow>
              ))}
            </SettingsSection>
          ))}
        </SettingsGrid>
      ) : (
        groups.map((g) => (
          <SettingsSection key={g.title} title={g.title} description={g.description}>
            {g.fields.map((f) => (
              <FieldRow key={f.name} label={f.label} hint={f.hint}>
                <FieldInput field={f} value={state[f.name]} onChange={(v) => set(f.name, v)} />
              </FieldRow>
            ))}
          </SettingsSection>
        ))
      )}
      {footer}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setDraft(value)} disabled={isLoading}>
          <RotateCcw className="mr-1.5 h-4 w-4" />Reset
        </Button>
        <Button onClick={() => save.mutate(state)} disabled={save.isPending || isLoading}>
          <Save className="mr-1.5 h-4 w-4" />{save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
