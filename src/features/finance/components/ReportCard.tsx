import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Filter } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function ReportCard({ title, subtitle, filters, children, actions }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button size="sm" variant="outline"><Printer className="mr-1.5 h-4 w-4" />Print</Button>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
        </div>
      </CardHeader>
      {filters && (
        <div className="flex flex-wrap items-end gap-3 border-b border-border bg-muted/20 px-4 py-3 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {filters}
        </div>
      )}
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}