import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    supabase.from("profiles").select("username").eq("id", profile.id).maybeSingle().then(({ data }) => {
      setUsername((data as { username?: string } | null)?.username ?? "");
    });
  }, [profile?.id]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username: username || null })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setNewPassword(""); setConfirmPassword("");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Account</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="optional" /></div>
              <div className="space-y-2"><Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled /></div>
            </div>
            <Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>New password</Label>
                <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Confirm password</Label>
                <Input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
            </div>
            <Button type="submit" disabled={savingPwd}>{savingPwd ? "Updating…" : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}