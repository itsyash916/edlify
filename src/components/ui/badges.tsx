import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Trophy, Zap } from "lucide-react";

interface StreakBadgeProps {
  count: number;
  className?: string;
}

export const StreakBadge = ({ count, className }: StreakBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md",
        "bg-muted text-muted-foreground",
        className
      )}
    >
      <Flame className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{count}</span>
    </div>
  );
};

interface PointsBadgeProps {
  points: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const PointsBadge = ({ 
  points, 
  size = "md", 
  showIcon = true,
  className 
}: PointsBadgeProps) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1",
    lg: "px-3 py-1.5 text-base gap-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-md font-medium",
        "bg-muted text-foreground",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Zap className={iconSizes[size]} />}
      <span>{points.toLocaleString()}</span>
    </div>
  );
};

interface RankBadgeProps {
  rank: number;
  className?: string;
}

export const RankBadge = ({ rank, className }: RankBadgeProps) => {
  const getRankStyle = () => {
    if (rank === 1) return "bg-foreground text-background";
    if (rank === 2) return "bg-muted-foreground text-background";
    if (rank === 3) return "bg-muted-foreground/70 text-background";
    return "bg-muted text-muted-foreground";
  };

  const getRankIcon = () => {
    if (rank <= 3) return <Trophy className="w-3 h-3" />;
    return <Star className="w-3 h-3" />;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md font-medium text-xs",
        getRankStyle(),
        className
      )}
    >
      {getRankIcon()}
      <span>#{rank}</span>
    </div>
  );
};

interface AchievementBadgeProps {
  name: string;
  icon: React.ReactNode;
  unlocked?: boolean;
  rarity?: "common" | "rare" | "epic" | "legendary";
  className?: string;
}

export const AchievementBadge = ({ 
  name, 
  icon, 
  unlocked = false,
  rarity = "common",
  className 
}: AchievementBadgeProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
        "bg-card transition-all duration-200",
        !unlocked && "opacity-40 grayscale",
        className
      )}
    >
      <div className="text-2xl">{icon}</div>
      <span className="text-xs font-medium text-center">{name}</span>
    </motion.div>
  );
};

interface AnimatedPointsProps {
  points: number;
  show: boolean;
  positive?: boolean;
}

export const AnimatedPoints = ({ points, show, positive = true }: AnimatedPointsProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -16 }}
          exit={{ opacity: 0, y: -32, scale: 0.8 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "absolute font-medium text-base pointer-events-none",
            positive ? "text-foreground" : "text-destructive"
          )}
        >
          {positive ? "+" : ""}{points}
        </motion.div>
      )}
    </AnimatePresence>
  );
};