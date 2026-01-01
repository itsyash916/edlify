import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard, StatCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { StreakBadge, PointsBadge, RankBadge, AchievementBadge } from "@/components/ui/badges";
import { LinearProgress } from "@/components/ui/progress";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAppStore, getLeaderboard } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  Settings,
  LogOut,
  Trophy,
  Zap,
  Clock,
  Target,
  Award,
  TrendingUp,
  BookOpen,
  MessageCircle,
  ChevronRight
} from "lucide-react";

const achievements = [
  { id: "speed-demon", name: "Speed Demon", icon: "⚡", rarity: "epic" as const, unlocked: true },
  { id: "consistent-learner", name: "Consistent Learner", icon: "📚", rarity: "rare" as const, unlocked: true },
  { id: "early-bird", name: "Early Bird", icon: "🌅", rarity: "common" as const, unlocked: true },
  { id: "night-owl", name: "Night Owl", icon: "🦉", rarity: "common" as const, unlocked: false },
  { id: "doubt-slayer", name: "Doubt Slayer", icon: "🗡️", rarity: "legendary" as const, unlocked: false },
  { id: "quiz-master", name: "Quiz Master", icon: "🏆", rarity: "epic" as const, unlocked: false },
];

const ProfilePage = () => {
  const { user } = useAppStore();
  const leaderboard = getLeaderboard();
  const userRank = leaderboard.find(l => l.userId === user.id)?.rank || 0;

  const stats = [
    { label: "Study Hours", value: Math.floor(user.totalStudyMinutes / 60), icon: <Clock className="w-5 h-5" /> },
    { label: "Quizzes", value: user.quizzesCompleted, icon: <BookOpen className="w-5 h-5" /> },
    { label: "Doubts Helped", value: user.doubtsAnswered, icon: <MessageCircle className="w-5 h-5" /> },
    { label: "Accuracy", value: "78%", icon: <Target className="w-5 h-5" /> },
  ];

  return (
    <PageLayout title="Profile" showPoints={false}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Profile Header */}
        <FadeIn>
          <GlassCard className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
            
            <div className="relative flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-[0_0_30px_hsl(217_91%_60%_/_0.3)]"
                >
                  {user.name.charAt(0)}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <RankBadge rank={userRank} />
                    <StreakBadge count={user.streak} />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="iconSm">
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Points Display */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{user.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Points</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-success">+245</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Stats Grid */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </FadeIn>

        {/* Achievements */}
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <span className="text-sm text-muted-foreground">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <AchievementBadge
                  name={achievement.name}
                  icon={achievement.icon}
                  rarity={achievement.rarity}
                  unlocked={achievement.unlocked}
                />
              </motion.div>
            ))}
          </div>
        </FadeIn>

        {/* Weekly Progress */}
        <FadeIn delay={0.3}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Weekly Goal</h3>
              <span className="text-sm text-muted-foreground">5/7 days</span>
            </div>
            <LinearProgress value={5} max={7} color="success" height="lg" />
            <p className="text-sm text-muted-foreground mt-3">
              2 more days to earn the weekly bonus of <span className="text-success font-medium">+100 points</span>
            </p>
          </GlassCard>
        </FadeIn>

        {/* Subject Performance */}
        <FadeIn delay={0.35}>
          <h3 className="text-lg font-semibold mb-3">Subject Performance</h3>
          <GlassCard className="p-4 space-y-4">
            {[
              { subject: "Mathematics", accuracy: 82, color: "primary" },
              { subject: "Science", accuracy: 75, color: "success" },
              { subject: "English", accuracy: 88, color: "secondary" },
              { subject: "Social Science", accuracy: 70, color: "warning" },
            ].map((item) => (
              <div key={item.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.subject}</span>
                  <span className="text-sm text-muted-foreground">{item.accuracy}%</span>
                </div>
                <LinearProgress 
                  value={item.accuracy} 
                  max={100} 
                  color={item.color as any}
                  height="sm"
                />
              </div>
            ))}
          </GlassCard>
        </FadeIn>

        {/* Actions */}
        <FadeIn delay={0.4}>
          <GlassCard className="divide-y divide-border/50">
            <motion.button
              whileHover={{ backgroundColor: "hsl(var(--card-hover))" }}
              className="w-full flex items-center justify-between p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
            <motion.button
              whileHover={{ backgroundColor: "hsl(var(--card-hover))" }}
              className="w-full flex items-center justify-between p-4 transition-colors text-destructive"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </GlassCard>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;
