import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 space-y-8">
      {/* Brand Skeleton */}
      <Skeleton className="w-20 h-20 rounded-2xl" />
      
      {/* Title / Description Skeleton */}
      <div className="space-y-4 max-w-sm w-full">
        <Skeleton className="h-10 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
