import { Skeleton } from '@restaurantos/ui';

export function KDSSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-2 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/50">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-12" />
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
            <div className="p-3 pt-0">
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
