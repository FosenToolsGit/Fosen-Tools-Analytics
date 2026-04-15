import { Skeleton } from "@/components/ui/skeleton";

interface MetricGridProps {
  children?: React.ReactNode;
  loading?: boolean;
}

export function MetricGrid({ children, loading }: MetricGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
