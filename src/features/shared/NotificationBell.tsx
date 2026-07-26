import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useMarkNotificationRead, useMyNotifications } from "./doc-integration";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { data: items = [] } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const unread = items.filter((n) => n.status !== "read").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="font-medium text-sm">Notifications</div>
          <span className="text-xs text-muted-foreground">{unread} unread</span>
        </div>
        <div className="max-h-96 overflow-auto divide-y">
          {items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
          )}
          {items.map((n) => (
            <div key={n.id} className={`p-3 text-sm ${n.status !== "read" ? "bg-muted/40" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{n.subject}</div>
                {n.status !== "read" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => markRead.mutate(n.id)}
                    aria-label="Mark as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })} · {n.channel}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}