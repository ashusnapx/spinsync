import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, RotateCw, Settings, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type MachineStatus = "free" | "occupied" | "grace_period" | "maintenance" | "offline";

interface MachineCardProps {
  id: string;
  name: string;
  status: MachineStatus;
  timeRemaining?: string;
  onAction?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  free: { label: "Available", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  occupied: { label: "In Use", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  grace_period: { label: "Grace Period", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  maintenance: { label: "Maintenance", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  offline: { label: "Offline", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export function MachineCard({ id, name, status, timeRemaining, onAction, isAdmin, onEdit, onDelete }: MachineCardProps) {
  const config = statusConfig[status];

  return (
    <Card className="group relative overflow-hidden bg-card border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Admin Actions Overlay */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-400" onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
            <AlertCircle className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Dynamic Status Glow */}
      <div 
        className={cn(
          "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
          status === "free" && "bg-emerald-500",
          status === "occupied" && "bg-rose-500",
          status === "grace_period" && "bg-amber-500",
          status === "maintenance" && "bg-violet-500",
        )}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white mb-1 group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-sm text-muted-foreground font-mono">ID: {id}</p>
          </div>
          <Badge variant="outline" className={cn("px-2.5 py-0.5", config.color)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1 mt-4">
          <span className="text-sm font-medium text-muted-foreground">Time Remaining</span>
          {timeRemaining ? (
            <span className="text-3xl font-black tabular-nums tracking-tighter text-white">
              {timeRemaining}
            </span>
          ) : (
            <span className="text-3xl font-black tracking-tighter text-white/20">
              --:--
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-border/50">
        <Button 
          variant={status === "free" ? "default" : "secondary"} 
          className="w-full relative"
          disabled={status !== "free"}
          onClick={onAction}
        >
          {status === "free" && <><Play className="w-4 h-4 mr-1" /> Start Machine</>}
          {status === "occupied" && <><RotateCw className="w-4 h-4 mr-1 animate-spin-slow" /> Running...</>}
          {status === "grace_period" && "Waiting for pickup"}
          {status === "maintenance" && <><Settings className="w-4 h-4 mr-1" /> Maintenance</>}
          {status === "offline" && <><AlertCircle className="w-4 h-4 mr-1" /> Unavailable</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
