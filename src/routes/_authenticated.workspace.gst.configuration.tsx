import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ShieldCheck, PlugZap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/gst/configuration")({
  component: GstConfiguration,
});

function GstConfiguration() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Entity GST profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Legal name</Label><Input defaultValue="Ind Guru Manufacturing Pvt Ltd" /></div>
          <div><Label>GSTIN</Label><Input defaultValue="29AABCI1234F1Z5" className="font-mono" /></div>
          <div><Label>PAN</Label><Input defaultValue="AABCI1234F" className="font-mono" /></div>
          <div><Label>State</Label>
            <Select defaultValue="29">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="27">Maharashtra (27)</SelectItem>
                <SelectItem value="29">Karnataka (29)</SelectItem>
                <SelectItem value="33">Tamil Nadu (33)</SelectItem>
                <SelectItem value="07">Delhi (07)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Registration type</Label>
            <Select defaultValue="regular">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="composition">Composition</SelectItem>
                <SelectItem value="sez">SEZ</SelectItem>
                <SelectItem value="casual">Casual Taxable Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">e-Invoicing enabled</div>
              <div className="text-xs text-muted-foreground">Auto-generate IRN for B2B invoices above the applicable turnover threshold</div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Auto e-Way Bill</div>
              <div className="text-xs text-muted-foreground">Generate EWB when consignment exceeds ₹50,000</div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button size="sm"><Save className="mr-1.5 h-4 w-4" /> Save profile</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-primary" /> NIC / GSP integration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Placeholder</Badge>
            <span className="text-xs text-muted-foreground">Swappable adapter — connect a GSP or the NIC sandbox when going live.</span>
          </div>
          <div><Label>Provider</Label>
            <Select defaultValue="mock">
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
          <div><Label>GSP Base URL</Label><Input placeholder="https://einv-apisandbox.nic.in" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Client ID</Label><Input placeholder="••••••••" /></div>
            <div><Label>Client Secret</Label><Input type="password" placeholder="••••••••" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Username</Label><Input placeholder="portal-username" /></div>
            <div><Label>Password</Label><Input type="password" placeholder="••••••••" /></div>
          </div>
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Credentials are proxied through the server; real requests to the NIC IRP / EWB portal will be wired via <code className="font-mono">src/features/gst/api.ts</code>.
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline">Test connection</Button>
            <Button size="sm"><Save className="mr-1.5 h-4 w-4" /> Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}