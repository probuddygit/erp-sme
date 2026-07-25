import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getPlatformSettings,
  updatePlatformSetting,
  listFeatureFlags,
  updateFeatureFlag,
} from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Flag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const fetchSettings = useServerFn(getPlatformSettings);
  const updateSettingFn = useServerFn(updatePlatformSetting);
  const fetchFlags = useServerFn(listFeatureFlags);
  const updateFlagFn = useServerFn(updateFeatureFlag);

  const [settings, setSettings] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([fetchSettings(), fetchFlags()]);
      setSettings(s);
      setFlags(f);
      const defaults: Record<string, any> = {};
      for (const item of s) defaults[item.key] = item.value;
      for (const item of f) defaults[item.key] = item.enabled;
      setEditValues(defaults);
    } catch (e: any) {
      toast.error(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveSetting = async (key: string) => {
    try {
      await updateSettingFn({ data: { key, value: editValues[key] } });
      toast.success("Setting updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update setting");
    }
  };

  const handleToggleFlag = async (flag: any) => {
    try {
      await updateFlagFn({
        data: {
          key: flag.key,
          enabled: !flag.enabled,
          target: flag.target,
          targetValue: flag.target_value,
        },
      });
      toast.success("Feature flag updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update feature flag");
    }
  };

  const handleFlagTarget = async (flag: any, target: string) => {
    try {
      await updateFlagFn({ data: { key: flag.key, enabled: flag.enabled, target: target as any } });
      toast.success("Feature flag updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update feature flag");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : settings.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No global settings configured.</p>
          ) : (
            <div className="space-y-4">
              {settings.map((s) => (
                <div key={s.key} className="grid gap-3 md:grid-cols-[1fr_2fr_auto] items-center rounded-md border border-border p-3">
                  <div>
                    <div className="font-medium text-sm">{s.key}</div>
                    <div className="text-xs text-muted-foreground">{s.description || "No description"}</div>
                  </div>
                  <div>
                    {typeof s.value === "boolean" ? (
                      <Switch
                        checked={editValues[s.key] ?? s.value}
                        onCheckedChange={(v) => {
                          setEditValues((prev) => ({ ...prev, [s.key]: v }));
                          updateSettingFn({ data: { key: s.key, value: v } }).catch(() => {});
                        }}
                      />
                    ) : (
                      <Input
                        value={editValues[s.key] ?? s.value}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                      />
                    )}
                  </div>
                  {typeof s.value !== "boolean" && (
                    <Button size="sm" onClick={() => handleSaveSetting(s.key)}>
                      Save
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : flags.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No feature flags configured.</p>
          ) : (
            <div className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.key} className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center rounded-md border border-border p-3">
                  <div>
                    <div className="font-medium text-sm">{flag.key}</div>
                    <div className="text-xs text-muted-foreground">{flag.description || "No description"}</div>
                  </div>
                  <Select value={flag.target} onValueChange={(v) => handleFlagTarget(flag, v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="plan">Plan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch checked={flag.enabled} onCheckedChange={() => handleToggleFlag(flag)} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
