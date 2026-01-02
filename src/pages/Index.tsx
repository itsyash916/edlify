import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard, StatCard, ActionCard } from "@/components/ui/glass-card";
import { StreakBadge, RankBadge } from "@/components/ui/badges";
import { LinearProgress } from "@/components/ui/progress";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Timer, 
  HelpCircle, 
  Trophy,
  Target,
  TrendingUp,
  Clock,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  streak: number;
  rank?: number;
}

const Index = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState(0);
  
  const todayStudyMinutes = Math.floor((profile?.total_study_minutes || 0) % 60);
  const dailyGoal = 60;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("id, name, points, streak")
        .order("points", { ascending: false })
        .limit(10);
      
      if (data) {
        const rankedData = data.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));
        setLeaderboard(rankedData);
        
        // Find user's rank
        if (profile?.id) {
          const userEntry = rankedData.find(e => e.id === profile.id);
          if (userEntry) {
            setUserRank(userEntry.rank || 0);
          } else {
            // User not in top 10, fetch their actual rank
            const { count } = await supabase
              .from("profiles_public")
              .select("*", { count: "exact", head: true })
              .gt("points", profile.points || 0);
            setUserRank((count || 0) + 1);
          }
        }
      }
    };
    
    fetchLeaderboard();
  }, [profile]);

  const firstName = profile?.name?.split(" ")[0] || "Student";

  return (
    <PageLayout points={profile?.points || 0}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Welcome back, {firstName}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Ready to learn today?</p>
            </div>
            <StreakBadge count={profile?.streak || 0} />
          </div>
        </FadeIn>

        {/* Daily Progress Card */}
        <FadeIn delay={0.1}>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Today's Progress</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {todayStudyMinutes}/{dailyGoal} min
              </span>
            </div>
            <LinearProgress 
              value={todayStudyMinutes} 
              max={dailyGoal} 
              color="primary"
              height="md"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {dailyGoal - todayStudyMinutes > 0 
                ? `${dailyGoal - todayStudyMinutes} minutes left to maintain your streak`
                : "Great job! You've completed today's goal"
              }
            </p>
          </GlassCard>
        </FadeIn>

        {/* Quick Stats */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              value={(profile?.points || 0).toLocaleString()}
              label="Total Points"
              icon={<Zap className="w-4 h-4" />}
            />
            <StatCard
              value={`#${userRank || "-"}`}
              label="Global Rank"
              icon={<Trophy className="w-4 h-4" />}
            />
          </div>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.3}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</h3>
          <StaggerContainer staggerDelay={0.08} className="space-y-2">
            <StaggerItem>
              <ActionCard
                title="Start Quiz"
                description="Test your knowledge"
                icon={<Zap className="w-5 h-5" />}
                onClick={() => navigate("/quiz")}
              />
            </StaggerItem>
            <StaggerItem>
              <ActionCard
                title="Focus Mode"
                description="Pomodoro study session"
                icon={<Timer className="w-5 h-5" />}
                onClick={() => navigate("/pomodoro")}
              />
            </StaggerItem>
            <StaggerItem>
              <ActionCard
                title="Doubt Board"
                description="Ask or help others"
                icon={<HelpCircle className="w-5 h-5" />}
                onClick={() => navigate("/doubts")}
              />
            </StaggerItem>
          </StaggerContainer>
        </FadeIn>

        {/* Mini Leaderboard */}
        <FadeIn delay={0.4}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Top Performers</h3>
            <button
              onClick={() => navigate("/leaderboard")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              View all
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <GlassCard className="divide-y divide-border">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`flex items-center gap-3 p-3 ${entry.id === profile?.id ? "bg-muted" : ""}`}
              >
                <RankBadge rank={entry.rank || index + 1} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.points.toLocaleString()} pts
                  </p>
                </div>
                <StreakBadge count={entry.streak} />
              </motion.div>
            ))}
          </GlassCard>
        </FadeIn>

        {/* Weekly Stats */}
        <FadeIn delay={0.5}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">This Week</h3>
          <div className="grid grid-cols-3 gap-2">
            <GlassCard className="p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-base font-semibold">{Math.floor((profile?.total_study_minutes || 0) / 60)}h</p>
              <p className="text-2xs text-muted-foreground">Study Time</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <BookOpen className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-base font-semibold">{profile?.quizzes_completed || 0}</p>
              <p className="text-2xs text-muted-foreground">Quizzes</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-base font-semibold">{profile?.doubts_answered || 0}</p>
              <p className="text-2xs text-muted-foreground">Helped</p>
            </GlassCard>
          </div>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default Index;