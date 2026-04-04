import type { ComponentType } from "react";
import {
  AlertTriangle,
  Clock3,
  MapPin,
  QrCode,
  Settings2,
  ShieldAlert,
  StopCircle,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MachineCardStatus =
  | "free"
  | "occupied"
  | "grace_period"
  | "locked"
  | "maintenance"
  | "out_of_order";

export interface MachineCardAction {
  label: string;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary" | "destructive";
  disabled?: boolean;
}

interface MachineCardProps {
  id: string;
  name: string;
  type: string;
  status: MachineCardStatus;
  floor?: string | null;
  location?: string | null;
  primaryAction?: MachineCardAction | null;
  secondaryAction?: MachineCardAction | null;
  adminActions?: MachineCardAction[];
}

const statusConfig: Record<
  MachineCardStatus,
  {
    label: string;
    badgeClassName: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  free: {
    label: "Available",
    badgeClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    description: "Ready for the next wash cycle.",
    icon: Clock3,
  },
  occupied: {
    label: "In Use",
    badgeClassName: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    description: "Machine is currently running.",
    icon: StopCircle,
  },
  grace_period: {
    label: "Grace Period",
    badgeClassName: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    description: "Cycle ended. Waiting for pickup.",
    icon: Clock3,
  },
  locked: {
    label: "Locked",
    badgeClassName: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    description: "Admin intervention is required.",
    icon: ShieldAlert,
  },
  maintenance: {
    label: "Maintenance",
    badgeClassName: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    description: "Temporarily unavailable for service work.",
    icon: Wrench,
  },
  out_of_order: {
    label: "Out of Order",
    badgeClassName: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    description: "Reported faulty and unavailable.",
    icon: AlertTriangle,
  },
};

export function MachineCard({
  id,
  name,
  type,
  status,
  floor,
  location,
  primaryAction,
  secondaryAction,
  adminActions = [],
}: MachineCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="h-full border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{name}</CardTitle>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {formatMachineType(type)} · {id.slice(0, 8)}
            </p>
          </div>
          <Badge variant="outline" className={cn("px-3 py-1", config.badgeClassName)}>
            {config.label}
          </Badge>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/5 p-2 text-primary">
              <StatusIcon className="size-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">{config.label}</div>
              <div className="mt-1 text-sm text-white/55">{config.description}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <MachineMetaRow label="Type" value={formatMachineType(type)} />
        <MachineMetaRow label="Floor" value={floor || "Not set"} />
        <MachineMetaRow
          label="Location"
          value={location || "Location details not added"}
          icon={MapPin}
        />

        {adminActions.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs uppercase tracking-[0.18em] text-white/35">
              Admin Controls
            </div>
            <div className="flex flex-wrap gap-2">
              {adminActions.map((action) => {
                const Icon = action.icon ?? Settings2;

                return (
                  <Button
                    key={action.label}
                    variant={action.variant ?? "outline"}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <Icon className="size-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {(primaryAction || secondaryAction) && (
        <CardFooter className="grid gap-3 border-t border-white/10 bg-white/5 sm:grid-cols-2">
          {primaryAction && <MachineActionButton action={primaryAction} />}
          {secondaryAction && <MachineActionButton action={secondaryAction} />}
        </CardFooter>
      )}
    </Card>
  );
}

function MachineActionButton({ action }: { action: MachineCardAction }) {
  const Icon = action.icon ?? QrCode;

  return (
    <Button
      variant={action.variant ?? "default"}
      className="w-full"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      <Icon className="size-4" />
      {action.label}
    </Button>
  );
}

function MachineMetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-black/10 px-4 py-3">
      <div className="text-sm text-white/45">{label}</div>
      <div className="flex items-center gap-2 text-right text-sm font-medium text-white/80">
        {Icon ? <Icon className="size-4 text-white/35" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function formatMachineType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
