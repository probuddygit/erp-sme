import { Search, ChevronDown, Menu, LogOut, User } from "lucide-react";
import { NotificationBell } from "@/features/shared/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: Props) {
  const { profile, company, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Company / Branch / FY switchers — visual only */}
      <div className="hidden items-center gap-2 md:flex">
        <SwitcherPill label={company?.name ?? "Workspace"} sub="Company" />
        <SwitcherPill label="Head Office" sub="Branch" />
        <SwitcherPill label="FY 2025-26" sub="Period" />
      </div>

      {/* Search */}
      <div className="relative ml-auto hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search anything…"
          className="h-9 border-border bg-muted/40 pl-9 text-sm"
        />
      </div>

      <div className="ml-auto md:ml-0">
        <NotificationBell />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium leading-tight">
                {profile?.full_name || profile?.email}
              </div>
              <div className="text-xs text-muted-foreground">{profile?.email}</div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function SwitcherPill({ label, sub }: { label: string; sub: string }) {
  return (
    <button className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {sub}
        </div>
        <div className="text-xs font-medium leading-tight">{label}</div>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}