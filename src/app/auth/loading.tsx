import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left visual side skeleton */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden border-r border-border bg-card/50">
        <Skeleton className="w-24 h-6" />
        <div className="max-w-lg space-y-6">
          <Skeleton className="h-16 w-3/4 rounded-xl" />
          <Skeleton className="h-16 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-full mt-4" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="absolute right-[-10%] top-[40%] w-[400px] h-[400px] rounded-full opacity-20" />
      </div>

      {/* Right form side skeleton */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
