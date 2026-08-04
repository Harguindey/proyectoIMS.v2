import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChartSkeletonProps {
  title?: string;
  height?: string;
}

export function ChartSkeleton({ title, height = "h-64" }: ChartSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${height} relative overflow-hidden rounded-lg bg-slate-50`}>
          <div className="absolute inset-0 animate-pulse">
            {/* Simulate chart bars/lines */}
            <div className="flex items-end justify-around h-full p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="w-8"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    animationDelay: `${index * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}