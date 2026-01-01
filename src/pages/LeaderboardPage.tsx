import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { RankBadge, StreakBadge, PointsBadge } from "@/components/ui/badges";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAppStore, getLeaderboard } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronDown
} from "lucide-react";

type LeaderboardFilter = "global" | "weekly" | "daily";
type SubjectFilter = "all" | "math" | "science" | "english" | "social";

const LeaderboardPage = () => {
  const { user } = useAppStore();
  const leaderboard = getLeaderboard();
  const [filter, setFilter] = useState<LeaderboardFilter>("global");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  
  const userEntry = leaderboard.find(e => e.userId === user.id);
  const userRank = userEntry?.rank || 0;

  const getTrendIcon = (change?: "up" | "down" | "same") => {
    switch (change) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <PageLayout title="Leaderboard" points={user.points}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* User's Rank Card */}
        <FadeIn>
          <GlassCard className="p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-3xl font-bold">#{userRank}</p>
              </div>
              <div className="text-right">
                <PointsBadge points={user.points} size="lg" />
                <p className="text-xs text-muted-foreground mt-2">
                  {userEntry?.rankChange === "up" && "↑ Moving up!"}
                  {userEntry?.rankChange === "down" && "↓ Keep going!"}
                  {userEntry?.rankChange === "same" && "Holding steady"}
                </p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <div className="flex gap-2">
            <div className="flex-1 flex gap-1 p-1 rounded-xl bg-muted/50">
              {(["global", "weekly", "daily"] as LeaderboardFilter[]).map((f) => (
                <motion.button
                  key={f}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </motion.button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="w-4 h-4" />
              All
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </FadeIn>

        {/* Top 3 Podium */}
        <FadeIn delay={0.2}>
          <div className="flex items-end justify-center gap-2 py-4">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(210_10%_70%)] to-[hsl(210_10%_60%)] flex items-center justify-center mb-2 border-2 border-[hsl(210_10%_70%)]">
                <span className="text-xl font-bold text-black">2</span>
              </div>
              <p className="text-sm font-medium truncate max-w-[80px]">
                {leaderboard[1]?.name.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {leaderboard[1]?.points.toLocaleString()}
              </p>
              <div className="w-20 h-16 bg-muted/50 rounded-t-lg mt-2" />
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(45_93%_58%)] to-[hsl(38_92%_50%)] flex items-center justify-center mb-2 border-2 border-[hsl(45_93%_58%)] shadow-[0_0_30px_hsl(45_93%_58%_/_0.4)]"
              >
                <Trophy className="w-8 h-8 text-black" />
              </motion.div>
              <p className="text-sm font-medium truncate max-w-[80px]">
                {leaderboard[0]?.name.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {leaderboard[0]?.points.toLocaleString()}
              </p>
              <div className="w-24 h-24 bg-gradient-to-t from-muted/50 to-primary/10 rounded-t-lg mt-2" />
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(30_80%_50%)] to-[hsl(25_80%_45%)] flex items-center justify-center mb-2 border-2 border-[hsl(30_80%_50%)]">
                <span className="text-xl font-bold text-black">3</span>
              </div>
              <p className="text-sm font-medium truncate max-w-[80px]">
                {leaderboard[2]?.name.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {leaderboard[2]?.points.toLocaleString()}
              </p>
              <div className="w-20 h-12 bg-muted/50 rounded-t-lg mt-2" />
            </motion.div>
          </div>
        </FadeIn>

        {/* Full Leaderboard */}
        <FadeIn delay={0.3}>
          <GlassCard className="divide-y divide-border/50 overflow-hidden">
            <StaggerContainer staggerDelay={0.05}>
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.userId === user.id;
                
                return (
                  <StaggerItem key={entry.userId}>
                    <motion.div
                      whileHover={{ backgroundColor: "hsl(var(--card-hover))" }}
                      className={cn(
                        "flex items-center gap-3 p-4 transition-colors",
                        isCurrentUser && "bg-primary/5"
                      )}
                    >
                      <div className="w-8 text-center">
                        {entry.rank <= 3 ? (
                          <RankBadge rank={entry.rank} />
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-medium">
                        {entry.name.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          isCurrentUser && "text-primary"
                        )}>
                          {entry.name}
                          {isCurrentUser && " (You)"}
                        </p>
                        <div className="flex items-center gap-2">
                          <StreakBadge count={entry.streak} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getTrendIcon(entry.rankChange)}
                        <PointsBadge points={entry.points} size="sm" />
                      </div>
                    </motion.div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </GlassCard>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default LeaderboardPage;
