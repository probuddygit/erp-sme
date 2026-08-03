import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ShieldCheck, PlugZap, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useGstProfile, useGspConfig, type GstProfile, type GspConfig } from "@/features/gst/gst-api";
import { fetchGstin, configureGstApi } from "@/features/gst/api";

export const Route = createFileRoute("/_authenticated/workspace/gst/configuration")({
  component: GstConfiguration,
});

const STATES = [
  { code: "07", name: "Delhi" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "24", name: "Gujarat" },
];

function GstConfiguration() {
  const { company } = useAuth();
  const profileStore = useGstProfile();
  const gspStore = useGspConfig();
  const [profile, setProfile] = useState<GstProfile>(profileStore.value);
  const [gsp, setGsp] = useState<GspConfig>(gspStore.value);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { setProfile({ ...profileStore.value, legalName: profileStore.value.legalName || company?.name || "" }); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileStore.isLoading, company?.id]);
  useEffect(() => { setGsp(gspStore.value); }, [gspStore.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyGstin() {
    if (!profile.gstin) { toast.error("Enter a GSTIN first"); return; }
    setVerifying(true);
    try {
      const res = await fetchGstin(profile.gstin);
      setProfile((p) => ({ ...p, legalName: res.legalName, stateCode: res.stateCode, pan: profile.gstin.slice(2, 12) }));
      toast.success(`GSTIN verified — ${res.legalName} (${res.status})`);
    } finally { setVerifying(false); }
  }

  async function saveProfile() {
    await profileStore.save(profile);
    toast.success("GST profile saved");
  }

  async function saveGsp() {
    await gspStore.save(gsp);
    configureGstApi({ provider: gsp.provider === "nic" ? "nic" : "mock", gspBaseUrl: gsp.baseUrl, clientId: gsp.clientId, username: gsp.username, gstin: profile.gstin });
    toast.success("Integration settings saved");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Entity GST profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Legal name</Label><Input value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} /></div>
          <div>
            <Label>GSTIN</Label>
            <div className="flex gap-2">
              <Input value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} className="font-mono" placeholder="29AABCI1234F1Z5" />
              <Button variant="outline" size="icon" onClick={verifyGstin} disabled={verifying} title="Verify GSTIN">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div><Label>PAN</Label><Input value={profile.pan} onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })} className="font-mono" /></div>
          <div><Label>State</Label>
            <Select value={profile.stateCode} onValueChange={(v) => setProfile({ ...profile, stateCode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Registration type</Label>
            <Select value={profile.registrationType} onValueChange={(v) => setProfile({ ...profile, registrationType: v as GstProfile["registrationType"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="composition">Composition</SelectItem>
                <SelectItem value="sez">SEZ</SelectItem>
                <SelectItem value="casual">Casual Taxable Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">e-Invoicing enabled</div>
              <div className="text-xs text-muted-foreground">Auto-generate IRN for B2B invoices above the applicable turnover threshold</div>
            </div>
            <Switch checked={profile.eInvoicing} onCheckedChange={(v) => setProfile({ ...profile, eInvoicing: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">Auto e-Way Bill</div>
              <div className="text-xs text-muted-foreground">Generate EWB when consignment exceeds the threshold</div>
            </div>
            <div className="flex items-center gap-3">
              <Input type="number" className="w-28" value={profile.ewbThreshold} onChange={(e) => setProfile({ ...profile, ewbThreshold: Number(e.target.value) })} />
              <Switch checked={profile.autoEwayBill} onCheckedChange={(v) => setProfile({ ...profile, autoEwayBill: v })} />
            </div>
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button size="sm" onClick={saveProfile} disabled={profileStore.saving}>
              {profileStore.saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><PlugZap className="h-4 w-4 text-primary" /> NIC / GSP integration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{gsp.provider === "mock" ? "Sandbox" : "Live"}</Badge>
            <span className="text-xs text-muted-foreground">Swappable adapter — connect a GSP or the NIC sandbox when going live.</span>
          </div>
          <div><Label>Provider</Label>
            <Select value={gsp.provider} onValueChange={(v) => setGsp({ ...gsp, provider: v as GspConfig["provider"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock (dev)</SelectItem>
                <SelectItem value="nic">NIC (production)</SelectItem>
                <SelectItem value="cygnet">Cygnet GSP</SelectItem>
                <SelectItem value="cleartax">ClearTax GSP</SelectItem>
                <SelectItem value="masters">Masters India</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>GSP Base URL</Label><Input value={gsp.baseUrl} onChange={(e) => setGsp({ ...gsp, baseUrl: e.target.value })} placeholder="https://einv-apisandbox.nic.in" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Client ID</Label><Input value={gsp.clientId} onChange={(e) => setGsp({ ...gsp, clientId: e.target.value })} placeholder="client-id" /></div>
            <div><Label>Username</Label><Input value={gsp.username} onChange={(e) => setGsp({ ...gsp, username: e.target.value })} placeholder="portal-username" /></div>
          </div>
          <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Client secret and portal password are never stored in the app — add them as backend secrets before switching the provider to a live GSP.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveGsp} disabled={gspStore.saving}>
              {gspStore.saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save integration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
