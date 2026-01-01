import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard, StatCard, ActionCard } from "@/components/ui/glass-card";
import { StreakBadge, RankBadge } from "@/components/ui/badges";
import { LinearProgress } from "@/components/ui/progress";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAppStore, getLeaderboard } from "@/lib/store";
import { 
  Zap, 
  Timer, 
  HelpCircle, 
  Trophy,
  Target,
  TrendingUp,
  Clock,
  BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const leaderboard = getLeaderboard();
  
  const todayStudyMinutes = 45;
  const dailyGoal = 60;
  const userRank = leaderboard.find(l => l.userId === user.id)?.rank || 0;

  return (
    <PageLayout points={user.points}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Welcome Section */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Hey, {user.name.split(" ")[0]}! 👋
              </h2>
              <p className="text-muted-foreground mt-1">Ready to learn today?</p>
            </div>
            <StreakBadge count={user.streak} />
          </div>
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
            <p className="text-sm text-muted-foreground mt-3">
              {dailyGoal - todayStudyMinutes} minutes left to maintain your streak!
            </p>
          </GlassCard>
        </FadeIn>

        {/* Quick Stats */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              value={user.points.toLocaleString()}
              label="Total Points"
              icon={<Zap className="w-5 h-5 text-success" />}
              accentColor="success"
            />
            <StatCard
              value={`#${userRank}`}
              label="Global Rank"
              icon={<Trophy className="w-5 h-5 text-warning" />}
              accentColor="warning"
              trend="up"
              trendValue="+2 today"
            />
          </div>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.3}>
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

        {/* Mini Leaderboard */}
        <FadeIn delay={0.4}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Top Performers</h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/leaderboard")}
              className="text-sm text-primary font-medium"
            >
              View all
            </motion.button>
          </div>
          <GlassCard className="divide-y divide-border/50">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 p-3"
              >
                <RankBadge rank={entry.rank} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.name}</p>
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
          <h3 className="text-lg font-semibold mb-3">This Week</h3>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-4 text-center">
              <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold">{Math.floor(user.totalStudyMinutes / 60)}h</p>
              <p className="text-2xs text-muted-foreground">Study Time</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <BookOpen className="w-5 h-5 text-secondary mx-auto mb-2" />
              <p className="text-lg font-bold">{user.quizzesCompleted}</p>
              <p className="text-2xs text-muted-foreground">Quizzes</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-lg font-bold">78%</p>
              <p className="text-2xs text-muted-foreground">Accuracy</p>
            </GlassCard>
          </div>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default Index;
