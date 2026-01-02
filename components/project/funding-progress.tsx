"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FundingProgressProps {
  raised: number;
  goal: number;
  currency?: string;
  showPercentage?: boolean;
  showGoal?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FundingProgress({
  raised,
  goal,
  currency = "MNT",
  showPercentage = true,
  showGoal = true,
  size = "md",
  className,
}: FundingProgressProps) {
  const percentage = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;

  const sizeStyles = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Progress value={percentage} className={sizeStyles[size]} />
      <div className={cn("flex justify-between", textSizes[size])}>
        <span className="font-semibold text-foreground">
          {raised.toLocaleString()} {currency}
          {showPercentage && (
            <span className="ml-1 text-muted-foreground">
              ({percentage.toFixed(0)}%)
            </span>
          )}
        </span>
        {showGoal && (
          <span className="text-muted-foreground">
            목표 {goal.toLocaleString()} {currency}
          </span>
        )}
      </div>
    </div>
  );
}
