import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard = ({ 
  children, 
  className, 
  hover = false,
  onClick 
}: GlassCardProps) => {
  const baseClasses = "bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl";
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={cn(
          baseClasses,
          "cursor-pointer hover:bg-card hover:border-border transition-colors",
          "shadow-[0_4px_24px_hsl(0_0%_0%_/_0.4)] hover:shadow-[0_8px_32px_hsl(0_0%_0%_/_0.5)]",
          className
        )}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div 
      className={cn(
        baseClasses,
        "shadow-[0_4px_24px_hsl(0_0%_0%_/_0.4)]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  accentColor?: "primary" | "secondary" | "success" | "warning";
}

export const StatCard = ({ 
  value, 
  label, 
  icon, 
  trend,
  trendValue,
  className,
  accentColor = "primary"
}: StatCardProps) => {
  const accentClasses = {
    primary: "from-primary/20 to-transparent border-primary/30",
    secondary: "from-secondary/20 to-transparent border-secondary/30",
    success: "from-success/20 to-transparent border-success/30",
    warning: "from-warning/20 to-transparent border-warning/30",
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <GlassCard className={cn("p-4", className)}>
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50",
        accentClasses[accentColor]
      )} />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
          {trend && trendValue && (
            <span className={cn("text-xs font-medium", trendColors[trend])}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {trendValue}
            </span>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-muted/50">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

interface ActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
  gradient?: boolean;
}

export const ActionCard = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  className,
  gradient = false
}: ActionCardProps) => {
  return (
    <GlassCard hover onClick={onClick} className={cn("p-5", className)}>
      {gradient && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
      )}
      <div className="relative flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
