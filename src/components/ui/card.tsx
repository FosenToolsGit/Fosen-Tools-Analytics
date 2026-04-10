import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-gray-900 border border-gray-800 rounded-xl p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
