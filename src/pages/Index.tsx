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
  Flame,
  Star,
  Award,
  Calendar,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  streak: number;
  rank?: number;
}

interface RecentActivity {
  id: string;
  type: "quiz" | "focus" | "doubt";
  title: string;
  points: number;
  created_at: string;
}

const Index = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dailyTip, setDailyTip] = useState("");
  
  const todayStudyMinutes = Math.floor((profile?.total_study_minutes || 0) % 60);
  const dailyGoal = 60;
  const studyHours = Math.floor((profile?.total_study_minutes || 0) / 60);

  // Daily motivational tips
  const tips = [
    "💡 Consistency beats intensity. Keep your streak alive!",
    "🧠 Take short breaks every 25 minutes to maximize retention.",
    "📚 Teaching others is the best way to learn. Help in Doubts!",
    "⚡ Quiz yourself regularly - active recall beats passive reading.",
    "🎯 Set specific goals for each study session.",
    "🌟 Celebrate small wins - every point counts!",
    "🔥 Your streak shows dedication. Keep it burning!",
    "💪 Struggling with a topic? Break it into smaller chunks.",
  ];

  useEffect(() => {
    // Set random daily tip
    setDailyTip(tips[Math.floor(Math.random() * tips.length)]);
    
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("profiles")
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
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .gt("points", profile.points || 0);
            setUserRank((count || 0) + 1);
          }
        }
      }
    };

    const fetchRecentActivities = async () => {
      if (!profile?.id) return;
      
      const activities: RecentActivity[] = [];
      
      // Fetch recent quiz completions
      const { data: quizData } = await supabase
        .from("quiz_completions")
        .select("id, points_earned, completed_at, quiz_id")
        .eq("user_id", profile.id)
        .order("completed_at", { ascending: false })
        .limit(3);
      
      if (quizData) {
        quizData.forEach(q => {
          activities.push({
            id: q.id,
            type: "quiz",
            title: "Completed Quiz",
            points: q.points_earned,
            created_at: q.completed_at,
          });
        });
      }
      
      // Fetch recent focus sessions
      const { data: focusData } = await supabase
        .from("focus_sessions")
        .select("id, session_name, points_earned, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (focusData) {
        focusData.forEach(f => {
          activities.push({
            id: f.id,
            type: "focus",
            title: f.session_name,
            points: f.points_earned,
            created_at: f.created_at,
          });
        });
      }
      
      // Sort by date and take top 5
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivities(activities.slice(0, 5));
    };
    
    fetchLeaderboard();
    fetchRecentActivities();
  }, [profile]);

  const firstName = profile?.name?.split(" ")[0] || "Student";
  const progressPercentage = Math.min((todayStudyMinutes / dailyGoal) * 100, 100);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <PageLayout points={profile?.points || 0}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Welcome Section with Time-based Greeting */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {getGreeting()}, {firstName}! 👋
              </h2>
              <p className="text-muted-foreground mt-1">Ready to level up today?</p>
            </div>
            <StreakBadge count={profile?.streak || 0} />
          </div>
        </FadeIn>

        {/* Daily Tip Card */}
        <FadeIn delay={0.05}>
          <GlassCard className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Tip of the Day</p>
                <p className="text-sm text-muted-foreground mt-0.5">{dailyTip}</p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Daily Progress Card */}
        <FadeIn delay={0.1}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold">Today's Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {todayStudyMinutes}/{dailyGoal} min
              </span>
            </div>
            <LinearProgress 
              value={todayStudyMinutes} 
              max={dailyGoal} 
              color="primary"
              height="lg"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">
                {dailyGoal - todayStudyMinutes > 0 
                  ? `${dailyGoal - todayStudyMinutes} minutes left to maintain your streak!`
                  : "🎉 Great job! You've completed today's goal!"
                }
              </p>
              {progressPercentage >= 100 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Star className="w-5 h-5 text-warning fill-warning" />
                </motion.div>
              )}
            </div>
          </GlassCard>
        </FadeIn>

        {/* Quick Stats */}
        <FadeIn delay={0.15}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              value={(profile?.points || 0).toLocaleString()}
              label="Total Points"
              icon={<Zap className="w-5 h-5 text-success" />}
              accentColor="success"
            />
            <StatCard
              value={`#${userRank || "-"}`}
              label="Global Rank"
              icon={<Trophy className="w-5 h-5 text-warning" />}
              accentColor="warning"
            />
          </div>
        </FadeIn>

        {/* Additional Stats Row */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-3 text-center">
              <Flame className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-lg font-bold">{profile?.streak || 0}</p>
              <p className="text-2xs text-muted-foreground">Day Streak</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">{studyHours}h</p>
              <p className="text-2xs text-muted-foreground">Total Study</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <Award className="w-5 h-5 text-secondary mx-auto mb-1" />
              <p className="text-lg font-bold">{profile?.quizzes_completed || 0}</p>
              <p className="text-2xs text-muted-foreground">Quizzes Done</p>
            </GlassCard>
          </div>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.25}>
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <StaggerContainer staggerDelay={0.1} className="grid gap-3">
            <StaggerItem>
              <ActionCard
                title="Start Quiz"
                description="Test your knowledge"
                icon={<Zap className="w-6 h-6" />}
                onClick={() => navigate("/quiz")}
                gradient
              />
            </StaggerItem>
            <StaggerItem>
              <ActionCard
                title="Focus Mode"
                description="Pomodoro study session"
                icon={<Timer className="w-6 h-6" />}
                onClick={() => navigate("/pomodoro")}
              />
            </StaggerItem>
            <StaggerItem>
              <ActionCard
                title="Doubt Board"
                description="Ask or help others"
                icon={<HelpCircle className="w-6 h-6" />}
                onClick={() => navigate("/doubts")}
              />
            </StaggerItem>
          </StaggerContainer>
        </FadeIn>

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <FadeIn delay={0.3}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/personal")}
                className="text-sm text-primary font-medium flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
            <GlassCard className="divide-y divide-border/50">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  className="flex items-center gap-3 p-3"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === "quiz" 
                      ? "bg-primary/20" 
                      : activity.type === "focus" 
                        ? "bg-success/20" 
                        : "bg-secondary/20"
                  }`}>
                    {activity.type === "quiz" ? (
                      <Zap className="w-4 h-4 text-primary" />
                    ) : activity.type === "focus" ? (
                      <Timer className="w-4 h-4 text-success" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {activity.points > 0 && (
                    <span className="text-sm font-medium text-success">+{activity.points}</span>
                  )}
                </motion.div>
              ))}
            </GlassCard>
          </FadeIn>
        )}

        {/* Mini Leaderboard */}
        <FadeIn delay={0.35}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Top Performers</h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/leaderboard")}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          <GlassCard className="divide-y divide-border/50">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`flex items-center gap-3 p-3 ${entry.id === profile?.id ? "bg-primary/10" : ""}`}
              >
                <RankBadge rank={entry.rank || index + 1} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.name}
                    {entry.id === profile?.id && (
                      <span className="text-xs text-primary ml-1">(You)</span>
                    )}
                  </p>
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
        <FadeIn delay={0.4}>
          <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-4 text-center">
              <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold">{studyHours}h</p>
              <p className="text-2xs text-muted-foreground">Study Time</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <BookOpen className="w-5 h-5 text-secondary mx-auto mb-2" />
              <p className="text-lg font-bold">{profile?.quizzes_completed || 0}</p>
              <p className="text-2xs text-muted-foreground">Quizzes</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-lg font-bold">{profile?.doubts_answered || 0}</p>
              <p className="text-2xs text-muted-foreground">Helped</p>
            </GlassCard>
          </div>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default Index;
