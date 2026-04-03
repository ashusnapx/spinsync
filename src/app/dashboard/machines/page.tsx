"use client";

import { MachineCard } from "@/components/ui/MachineCard";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [role, setRole] = useState<string>("free_user");
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [pgRes, machineRes] = await Promise.all([
        fetch("/api/pg").then(res => res.json()),
        fetch("/api/machines").then(res => res.json())
      ]);

      if (pgRes.success) setRole(pgRes.data.role);
      if (machineRes.success) setMachines(machineRes.data);
    } catch (err) {
      toast.error("Failed to load machine data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartMachine = (id: string) => {
    toast.success(`Machine ${id} assigned!`, {
      description: "You have 5 minutes to load your clothes.",
    });
    // Optimistic UI update
    setMachines(prev => prev.map(m => m.id === id ? { ...m, status: "occupied" } : m));
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;
    
    try {
      const res = await fetch(`/api/machines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Machine deleted");
        setMachines(prev => prev.filter(m => m.id !== id));
      } else {
        throw new Error(data.error?.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete machine");
    }
  };

  const handleAddMachine = async () => {
    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Washer ${machines.length + 1}`,
          type: "washing_machine",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Machine added");
        setMachines(prev => [...prev, data.data]);
      } else {
        throw new Error(data.error?.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add machine");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = role === "pg_admin";

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machine Access</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage and monitor your PG's machines." : "Select an available machine to begin."}
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={handleAddMachine} className="bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl px-6 py-4 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Machine
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full mb-8">
        <TabsList>
          <TabsTrigger value="all">All Machines ({machines.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({machines.filter(m => m.status === 'free').length})</TabsTrigger>
          <TabsTrigger value="active">Active/Waiting ({machines.filter(m => ['occupied', 'grace_period'].includes(m.status)).length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((machine, idx) => (
              <motion.div key={machine.id} variants={fadeUp} custom={idx}>
                <MachineCard
                  id={machine.id}
                  name={machine.name}
                  status={machine.status}
                  isAdmin={isAdmin}
                  onAction={() => handleStartMachine(machine.id)}
                  onDelete={() => handleDeleteMachine(machine.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="available" className="mt-6">
           <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {machines.filter(m => m.status === 'free').map(machine => (
                <MachineCard key={machine.id} {...machine} isAdmin={isAdmin} onAction={() => handleStartMachine(machine.id)} onDelete={() => handleDeleteMachine(machine.id)} />
             ))}
           </motion.div>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
           <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {machines.filter(m => ['occupied', 'grace_period'].includes(m.status)).map(machine => (
                <MachineCard key={machine.id} {...machine} isAdmin={isAdmin} onDelete={() => handleDeleteMachine(machine.id)} />
             ))}
           </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
