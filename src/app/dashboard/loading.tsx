import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Header Skeleton */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 z-40 flex items-center justify-between px-6">
         <Skeleton className="h-8 w-24" />
         <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Sidebar Skeleton (Hidden on Mobile) */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-72 bg-card border-r border-border flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>

        <div className="mt-auto border-t border-border pt-4 space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen relative pt-24 lg:pt-12 p-6 md:p-10 z-10 w-full max-w-6xl mx-auto space-y-8">
         <div className="space-y-3">
           <Skeleton className="h-10 w-1/3" />
           <Skeleton className="h-4 w-1/2" />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Skeleton className="h-32 w-full rounded-2xl" />
           <Skeleton className="h-32 w-full rounded-2xl" />
           <Skeleton className="h-32 w-full rounded-2xl" />
         </div>

         <Skeleton className="h-96 w-full rounded-3xl" />
      </main>
    </div>
  );
}
