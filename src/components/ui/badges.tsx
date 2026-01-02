import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Trophy, Zap } from "lucide-react";

interface StreakBadgeProps {
  count: number;
  className?: string;
}

export const StreakBadge = ({ count, className }: StreakBadgeProps) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30",
        className
      )}
    >
      <motion.div
        animate={{ 
          rotate: [-3, 3, -3],
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 0.8, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Flame className="w-4 h-4 text-warning" />
      </motion.div>
      <span className="text-sm font-bold text-warning">{count}</span>
    </motion.div>
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
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-full font-bold",
        "bg-gradient-to-r from-success/20 to-success/10 border border-success/30 text-success",
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
  const getRankColor = () => {
    if (rank === 1) return "from-[hsl(45_93%_58%)] to-[hsl(38_92%_50%)] text-black";
    if (rank === 2) return "from-[hsl(210_10%_70%)] to-[hsl(210_10%_60%)] text-black";
    if (rank === 3) return "from-[hsl(30_80%_50%)] to-[hsl(25_80%_45%)] text-black";
    return "from-muted to-muted text-muted-foreground";
  };

  const getRankIcon = () => {
    if (rank <= 3) return <Trophy className="w-3 h-3" />;
    return <Star className="w-3 h-3" />;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs",
        "bg-gradient-to-r",
        getRankColor(),
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
  const rarityClasses = {
    common: "from-muted/50 to-muted/30 border-muted-foreground/20",
    rare: "from-primary/30 to-primary/10 border-primary/40",
    epic: "from-secondary/30 to-secondary/10 border-secondary/40",
    legendary: "from-warning/30 to-warning/10 border-warning/40",
  };

  const glowClasses = {
    common: "",
    rare: "shadow-[0_0_15px_hsl(217_91%_60%_/_0.2)]",
    epic: "shadow-[0_0_15px_hsl(262_83%_58%_/_0.2)]",
    legendary: "shadow-[0_0_20px_hsl(38_92%_50%_/_0.3)]",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl border",
        "bg-gradient-to-br transition-all duration-300",
        rarityClasses[rarity],
        unlocked ? glowClasses[rarity] : "opacity-40 grayscale",
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
          animate={{ opacity: 1, scale: 1, y: -20 }}
          exit={{ opacity: 0, y: -40, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "absolute font-bold text-lg pointer-events-none",
            positive ? "text-success" : "text-destructive"
          )}
        >
          {positive ? "+" : ""}{points}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
