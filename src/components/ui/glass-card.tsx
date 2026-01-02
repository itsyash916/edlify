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
  const baseClasses = "bg-card border border-border rounded-lg";
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.15 }}
        onClick={onClick}
        className={cn(
          baseClasses,
          "cursor-pointer hover:bg-card-hover transition-colors",
          "shadow-sm hover:shadow-md",
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
        "shadow-sm",
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
  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <GlassCard className={cn("p-4", className)}>
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-semibold">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
          {trend && trendValue && (
            <span className={cn("text-xs font-medium", trendColors[trend])}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {trendValue}
            </span>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-muted">
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
}: ActionCardProps) => {
  return (
    <GlassCard hover onClick={onClick} className={cn("p-4", className)}>
      <div className="relative flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted text-foreground">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{title}</span>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};