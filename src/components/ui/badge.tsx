import { cn } from "@/lib/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "error" | "warning";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-gray-800 text-gray-300": variant === "default",
          "bg-green-900/50 text-green-400": variant === "success",
          "bg-red-900/50 text-red-400": variant === "error",
          "bg-yellow-900/50 text-yellow-400": variant === "warning",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
