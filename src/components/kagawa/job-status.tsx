"use client";

import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STYLES: Record<JobStatus, string> = {
  searching: "bg-accent/30 text-accent-foreground border-accent/40",
  accepted: "bg-primary/10 text-primary border-primary/20",
  en_route: "bg-primary/15 text-primary border-primary/25",
  in_progress: "bg-emerald-100 text-emerald-900 border-emerald-200",
  awaiting_payment: "bg-amber-100 text-amber-950 border-amber-200",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  const t = useT();
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STYLES[status], className)}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
