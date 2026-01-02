import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-foreground transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "destructive";
  showValue?: boolean;
  valueLabel?: string;
  animated?: boolean;
}

const CircularProgress = ({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  className,
  color = "primary",
  showValue = true,
  valueLabel,
  animated = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: "stroke-foreground",
    secondary: "stroke-muted-foreground",
    success: "stroke-foreground",
    warning: "stroke-foreground",
    destructive: "stroke-destructive",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClasses[color]}
          initial={animated ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-semibold">{value}</span>
          {valueLabel && (
            <span className="text-xs text-muted-foreground">{valueLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

interface LinearProgressProps {
  value: number;
  max: number;
  className?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "destructive";
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
  animated?: boolean;
}

const LinearProgress = ({
  value,
  max,
  className,
  color = "primary",
  showLabel = false,
  height = "md",
  animated = true,
}: LinearProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    primary: "bg-foreground",
    secondary: "bg-muted-foreground",
    success: "bg-foreground",
    warning: "bg-foreground",
    destructive: "bg-destructive",
  };

  const heightClasses = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heightClasses[height])}>
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={animated ? { width: 0 } : undefined}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
  className?: string;
  urgent?: boolean;
}

const TimerRing = ({
  timeLeft,
  totalTime,
  size = 80,
  className,
  urgent = false,
}: TimerRingProps) => {
  const percentage = (timeLeft / totalTime) * 100;
  const isLow = percentage <= 33;
  const isCritical = percentage <= 15;

  const getColor = () => {
    if (isCritical) return "destructive";
    if (isLow) return "secondary";
    return "primary";
  };

  return (
    <motion.div
      animate={urgent && isCritical ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      <CircularProgress
        value={timeLeft}
        max={totalTime}
        size={size}
        strokeWidth={6}
        color={getColor()}
        showValue
        valueLabel="sec"
        className={className}
      />
    </motion.div>
  );
};

export { Progress, CircularProgress, LinearProgress, TimerRing };