import {
  Bug,
  Droplets,
  Flower2,
  Hammer,
  Paintbrush,
  Shirt,
  ShoppingBag,
  Sparkles,
  Toolbox,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ServiceId, LucideIcon> = {
  cleaning: Sparkles,
  plumbing: Droplets,
  electrical: Zap,
  appliance: Wrench,
  carpentry: Hammer,
  painting: Paintbrush,
  aircon: Wind,
  pest: Bug,
  laundry: Shirt,
  gardening: Flower2,
  errands: ShoppingBag,
  handyman: Toolbox,
};

export function ServiceIcon({
  id,
  className,
}: {
  id: ServiceId;
  className?: string;
}) {
  const Icon = ICONS[id] ?? Wrench;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
}
