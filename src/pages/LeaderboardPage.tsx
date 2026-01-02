import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { RankBadge, StreakBadge, PointsBadge } from "@/components/ui/badges";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Trophy,
  TrendingUp,
  Loader2,
  Crown,
  ArrowUp,
  Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilePopover } from "@/components/ProfilePopover";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  streak: number;
  rank: number;
  total_study_minutes: number;
  accent_color?: string;
  animated_avatar_enabled?: boolean;
}

type LeaderboardTab = "points" | "study";

const LeaderboardPage = () => {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState(0);
  const [previousRank, setPreviousRank] = useState<number | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("points");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const orderColumn = activeTab === "points" ? "points" : "total_study_minutes";
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, points, streak, total_study_minutes, accent_color, animated_avatar_enabled")
        .order(orderColumn, { ascending: false });
      
      if (data && !error) {
        const rankedData = data.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
        setLeaderboard(rankedData as LeaderboardEntry[]);
        
        // Find current user's rank
        if (profile?.id) {
          const userEntry = rankedData.find(e => e.id === profile.id);
          const newRank = userEntry?.rank || 0;
          
          // Check if user leveled up
          if (previousRank !== null && newRank < previousRank) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 3000);
          }
          
          setPreviousRank(userRank);
          setUserRank(newRank);
        }
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [profile?.id, activeTab]);

  const top3 = leaderboard.slice(0, 3);

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <PageLayout title="Leaderboard" points={profile?.points || 0}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Leaderboard" points={profile?.points || 0}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Level Up Animation */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-center shadow-[0_0_50px_hsl(217_91%_60%_/_0.5)]">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <ArrowUp className="w-16 h-16 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold">Rank Up!</h2>
                <p className="text-lg opacity-90">You're now #{userRank}!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Switcher */}
        <FadeIn>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("points")}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                activeTab === "points"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy className="w-4 h-4" />
              Points
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("study")}
              className={cn(
                "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                activeTab === "study"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              Study Time
            </motion.button>
          </div>
        </FadeIn>

        {/* User's Rank Card */}
        <FadeIn>
          <GlassCard className="p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                {activeTab === "points" ? (
                  <Trophy className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Clock className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-3xl font-bold">#{userRank || "—"}</p>
              </div>
              <div className="text-right">
                {activeTab === "points" ? (
                  <PointsBadge points={profile?.points || 0} size="lg" />
                ) : (
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatStudyTime(profile?.total_study_minutes || 0)}</p>
                    <p className="text-xs text-muted-foreground">studied</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Keep going!
                </p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <FadeIn delay={0.1}>
            <div className="flex items-end justify-center gap-2 py-4">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <ProfilePopover userId={top3[1]?.id}>
                  <Avatar className="w-14 h-14 border-2 border-[hsl(210_10%_70%)] cursor-pointer">
                    <AvatarImage src={top3[1]?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-[hsl(210_10%_70%)] to-[hsl(210_10%_60%)] text-black font-bold">
                      2
                    </AvatarFallback>
                  </Avatar>
                </ProfilePopover>
                <p className="text-sm font-medium truncate max-w-[80px] mt-2">
                  {top3[1]?.name.split(" ")[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "points" 
                    ? top3[1]?.points.toLocaleString()
                    : formatStudyTime(top3[1]?.total_study_minutes || 0)
                  }
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
                  className="relative"
                >
                  {/* Animated Crown */}
                  <motion.div
                    animate={{ 
                      rotate: [-5, 5, -5],
                      y: [0, -2, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 z-10"
                  >
                    <Crown className="w-10 h-10 text-[hsl(45_93%_58%)] drop-shadow-[0_0_15px_hsl(45_93%_58%_/_0.8)]" />
                  </motion.div>
                  <ProfilePopover userId={top3[0]?.id}>
                    <Avatar className="w-20 h-20 border-4 border-[hsl(45_93%_58%)] shadow-[0_0_30px_hsl(45_93%_58%_/_0.5)] cursor-pointer">
                      <AvatarImage src={top3[0]?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-[hsl(45_93%_58%)] to-[hsl(38_92%_50%)] text-black">
                        <Trophy className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                  </ProfilePopover>
                </motion.div>
                <p className="text-sm font-medium truncate max-w-[80px] mt-2">
                  {top3[0]?.name.split(" ")[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "points" 
                    ? top3[0]?.points.toLocaleString()
                    : formatStudyTime(top3[0]?.total_study_minutes || 0)
                  }
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
                <ProfilePopover userId={top3[2]?.id}>
                  <Avatar className="w-14 h-14 border-2 border-[hsl(30_80%_50%)] cursor-pointer">
                    <AvatarImage src={top3[2]?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-[hsl(30_80%_50%)] to-[hsl(25_80%_45%)] text-black font-bold">
                      3
                    </AvatarFallback>
                  </Avatar>
                </ProfilePopover>
                <p className="text-sm font-medium truncate max-w-[80px] mt-2">
                  {top3[2]?.name.split(" ")[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "points" 
                    ? top3[2]?.points.toLocaleString()
                    : formatStudyTime(top3[2]?.total_study_minutes || 0)
                  }
                </p>
                <div className="w-20 h-12 bg-muted/50 rounded-t-lg mt-2" />
              </motion.div>
            </div>
          </FadeIn>
        )}

        {/* Full Leaderboard */}
        <FadeIn delay={0.2}>
          <GlassCard className="divide-y divide-border/50 overflow-hidden">
            <StaggerContainer staggerDelay={0.03}>
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.id === profile?.id;
                
                return (
                  <StaggerItem key={entry.id}>
                    <ProfilePopover userId={entry.id}>
                      <motion.div
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                        className={cn(
                          "flex items-center gap-3 p-4 transition-colors cursor-pointer",
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
                        
                        <div className="relative">
                          <Avatar 
                            className="w-10 h-10"
                            style={entry.accent_color ? {
                              boxShadow: `0 0 10px hsl(${entry.accent_color} / 0.5)`
                            } : undefined}
                          >
                            <AvatarImage src={entry.avatar_url || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 font-medium">
                              {entry.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {entry.rank === 1 && (
                            <motion.div
                              animate={{ rotate: [-5, 5, -5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -top-2 -right-1"
                            >
                              <Crown className="w-4 h-4 text-[hsl(45_93%_58%)] drop-shadow-[0_0_5px_hsl(45_93%_58%)]" />
                            </motion.div>
                          )}
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
                          {activeTab === "points" ? (
                            <PointsBadge points={entry.points} size="sm" />
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatStudyTime(entry.total_study_minutes)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </ProfilePopover>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </GlassCard>
        </FadeIn>

        {/* Total Users */}
        <FadeIn delay={0.3}>
          <p className="text-center text-sm text-muted-foreground">
            Total {leaderboard.length} students competing
          </p>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default LeaderboardPage;
