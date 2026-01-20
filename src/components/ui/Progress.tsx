"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  label?: string;
  color?: "default" | "yellow";
}

export function Progress({
  value,
  className,
  indicatorClassName,
  showLabel = false,
  label,
  color = "default",
}: ProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100);

  const getColorClasses = () => {
    if (color === "yellow") {
      return {
        track: "bg-card-hover",
        indicator: "bg-gradient-to-r from-primary-start to-primary-end",
      };
    }
    return {
      track: "bg-card-hover",
      indicator: "bg-gradient-to-r from-primary-start to-primary-end",
    };
  };

  const colors = getColorClasses();

  return (
    <div
      className={cn(
        "relative h-3 w-full rounded-full overflow-hidden",
        colors.track,
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          colors.indicator,
          indicatorClassName
        )}
        style={{
          width: `${percentage}%`,
          boxShadow: percentage > 0 ? "0 0 10px var(--glow-primary)" : "none",
        }}
      />
      {showLabel && label && (
        <div
          className="absolute top-1/2 -translate-y-1/2 text-secondary text-xs font-medium whitespace-nowrap px-2"
          style={{
            left: `${Math.max(percentage - 5, 5)}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
