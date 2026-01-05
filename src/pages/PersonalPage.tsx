import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LinearProgress } from "@/components/ui/progress";
import { AchievementBadge, StreakBadge, RankBadge } from "@/components/ui/badges";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Settings,
  LogOut,
  Plus,
  Check,
  Trash2,
  Target,
  Download,
  Zap,
  Clock,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Palette,
  Crown,
  Timer,
  Loader2,
  User,
  Camera,
  Sparkles,
  Image as ImageIcon,
  SkipForward,
  RotateCcw,
  Gift,
  Upload
} from "lucide-react";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageUpload } from "@/components/ImageUpload";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
}

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  rarity: string;
  badge_order: number;
}

interface FocusSession {
  id: string;
  session_name: string;
  duration_minutes: number;
  mode: string;
  points_earned: number;
  created_at: string;
}

const ACCENT_COLORS = [
  { name: "Electric Blue", value: "217 91% 60%" },
  { name: "Neon Purple", value: "262 83% 58%" },
  { name: "Emerald", value: "160 84% 39%" },
  { name: "Sunset Orange", value: "25 95% 53%" },
  { name: "Hot Pink", value: "330 81% 60%" },
  { name: "Cyber Yellow", value: "50 100% 50%" },
  { name: "Ice Blue", value: "195 100% 50%" },
  { name: "Crimson", value: "348 83% 47%" },
];

const SHOP_ITEMS = [
  { id: "accent", name: "Accent Color", price: 1000, duration: "7 days", icon: Palette, color: "secondary" },
  { id: "time_ext", name: "+5 Seconds", price: 100, duration: "1 use", icon: Timer, color: "warning" },
  { id: "skip", name: "Skip Question", price: 150, duration: "1 use", icon: SkipForward, color: "primary" },
  { id: "retry", name: "Second Chance", price: 200, duration: "1 use", icon: RotateCcw, color: "secondary" },
  { id: "animated_avatar", name: "Animated Avatar", price: 2000, duration: "7 days", icon: Sparkles, color: "warning" },
  { id: "banner", name: "Custom Banner", price: 1500, duration: "7 days", icon: ImageIcon, color: "success" },
];

const PersonalPage = () => {
  const { profile, signOut, refreshProfile, updatePoints, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAccentShop, setShowAccentShop] = useState(false);
  const [showBadgesDialog, setShowBadgesDialog] = useState(false);
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [confirmPurchaseItem, setConfirmPurchaseItem] = useState<typeof SHOP_ITEMS[0] | null>(null);
  
  // Settings form
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchGoals();
      fetchTodos();
      fetchBadges();
      fetchFocusSessions();
      setEditName(profile.name || "");
      setEditAvatarUrl(profile.avatar_url || "");
      setEditBio((profile as any).bio || "");
      setEditStatus((profile as any).status || "");
      setEditBannerUrl((profile as any).banner_url || "");
    }
  }, [profile?.id]);

  const fetchFocusSessions = async () => {
    const { data } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", profile?.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setFocusSessions(data);
  };

  const fetchGoals = async () => {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", profile?.id)
      .order("created_at", { ascending: false });
    if (data) setGoals(data);
  };

  const fetchTodos = async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", profile?.id)
      .order("created_at", { ascending: false });
    if (data) setTodos(data);
  };

  const fetchBadges = async () => {
    const { data: allBadges } = await supabase
      .from("badges")
      .select("*")
      .order("badge_order", { ascending: true });
    
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", profile?.id);
    
    if (allBadges) setBadges(allBadges);
    if (userBadges) setEarnedBadges(userBadges.map(b => b.badge_id));
  };

  const addGoal = async () => {
    if (!newGoal.trim() || !profile?.id) return;
    
    const { error } = await supabase
      .from("goals")
      .insert({ user_id: profile.id, title: newGoal.trim() });
    
    if (!error) {
      setNewGoal("");
      fetchGoals();
      toast.success("Goal added!");
    }
  };

  const toggleGoal = async (id: string, completed: boolean) => {
    await supabase.from("goals").update({ completed: !completed }).eq("id", id);
    fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    fetchGoals();
  };

  const addTodo = async () => {
    if (!newTodo.trim() || !profile?.id) return;
    
    const { error } = await supabase
      .from("todos")
      .insert({ user_id: profile.id, title: newTodo.trim() });
    
    if (!error) {
      setNewTodo("");
      fetchTodos();
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await supabase.from("todos").update({ completed: !completed }).eq("id", id);
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await supabase.from("todos").delete().eq("id", id);
    fetchTodos();
  };

  const downloadTodosPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-US", { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    doc.setFillColor(88, 28, 135);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("EDLIFY", 20, 25);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Your Personal To-Do List", 20, 35);
    
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, 55, 180, 25, 3, 3, 'F');
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`Generated: ${date}`, 25, 65);
    doc.text(`User: ${profile?.name || "Student"}`, 25, 73);
    doc.text(`Points: ${profile?.points?.toLocaleString() || 0}`, 140, 65);
    doc.text(`Streak: ${profile?.streak || 0} days`, 140, 73);
    
    let y = 95;
    
    const pending = todos.filter(t => !t.completed);
    const completed = todos.filter(t => t.completed);
    
    if (pending.length > 0) {
      doc.setFillColor(255, 237, 213);
      doc.roundedRect(15, y - 8, 180, 12, 2, 2, 'F');
      doc.setTextColor(194, 65, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`📋 Pending Tasks (${pending.length})`, 20, y);
      y += 15;
      
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      pending.forEach((todo, index) => {
        doc.setFillColor(index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248, index % 2 === 0 ? 252 : 248);
        doc.roundedRect(20, y - 5, 170, 10, 1, 1, 'F');
        doc.text(`☐  ${todo.title}`, 25, y + 2);
        y += 12;
        
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
      });
    }
    
    y += 10;
    
    if (completed.length > 0) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(15, y - 8, 180, 12, 2, 2, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`✅ Completed Tasks (${completed.length})`, 20, y);
      y += 15;
      
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      completed.forEach((todo, index) => {
        doc.setFillColor(index % 2 === 0 ? 248 : 252, index % 2 === 0 ? 252 : 255, index % 2 === 0 ? 248 : 252);
        doc.roundedRect(20, y - 5, 170, 10, 1, 1, 'F');
        doc.text(`✓  ${todo.title}`, 25, y + 2);
        y += 12;
        
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
      });
    }
    
    doc.setFillColor(88, 28, 135);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Made with ❤️ by EDLIFY • Study. Compete. Improve.", 105, 290, { align: 'center' });
    
    doc.save(`EDLIFY-TodoList-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePurchaseClick = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    
    if (!profile || profile.points < item.price) {
      toast.error(`Not enough points! You need ${item.price} points.`);
      return;
    }
    
    setConfirmPurchaseItem(item);
  };

  const confirmPurchase = async () => {
    if (!profile || !confirmPurchaseItem) return;
    
    const itemId = confirmPurchaseItem.id;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await updatePoints(-confirmPurchaseItem.price, `${itemId}_purchase`, `Purchased ${confirmPurchaseItem.name}`);
    setConfirmPurchaseItem(null);

    if (itemId === "accent") {
      setShowAccentShop(true);
      return;
    } else if (itemId === "time_ext") {
      await supabase
        .from("profiles")
        .update({ time_extension_count: (profile.time_extension_count || 0) + 1 })
        .eq("id", profile.id);
      toast.success("Time extension purchased!");
    } else if (itemId === "skip") {
      await supabase
        .from("profiles")
        .update({ skip_question_count: ((profile as any).skip_question_count || 0) + 1 } as any)
        .eq("id", profile.id);
      toast.success("Skip question purchased!");
    } else if (itemId === "retry") {
      await supabase
        .from("profiles")
        .update({ second_chance_count: ((profile as any).second_chance_count || 0) + 1 } as any)
        .eq("id", profile.id);
      toast.success("Second chance purchased!");
    } else if (itemId === "animated_avatar") {
      await supabase
        .from("profiles")
        .update({ 
          animated_avatar_enabled: true,
          animated_avatar_expires_at: expiresAt.toISOString()
        } as any)
        .eq("id", profile.id);
      toast.success("Animated avatar enabled for 7 days!");
    } else if (itemId === "banner") {
      setShowBannerDialog(true);
      return;
    }

    await refreshProfile();
  };

  const purchaseAccent = async (accentValue: string) => {
    if (!profile) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase
      .from("profiles")
      .update({ 
        accent_color: accentValue,
        accent_expires_at: expiresAt.toISOString()
      })
      .eq("id", profile.id);

    await refreshProfile();
    setShowAccentShop(false);
    toast.success("Accent color applied for 7 days!");
  };

  const saveBanner = async () => {
    if (!profile?.id || !editBannerUrl.trim()) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase
      .from("profiles")
      .update({ 
        banner_url: editBannerUrl.trim(),
        banner_expires_at: expiresAt.toISOString()
      } as any)
      .eq("id", profile.id);

    await refreshProfile();
    setShowBannerDialog(false);
    toast.success("Banner applied for 7 days!");
  };

  const saveSettings = async () => {
    if (!profile?.id || !editName.trim()) return;
    
    setSavingSettings(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        name: editName.trim(),
        avatar_url: editAvatarUrl.trim() || null,
        bio: editBio.trim() || null,
        status: editStatus.trim() || null,
      } as any)
      .eq("id", profile.id);
    
    if (!error) {
      await refreshProfile();
      toast.success("Profile updated!");
      setShowSettings(false);
    } else {
      toast.error("Failed to update profile");
    }
    setSavingSettings(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const stats = [
    { label: "Study Hours", value: Math.floor((profile?.total_study_minutes || 0) / 60), icon: <Clock className="w-5 h-5" /> },
    { label: "Quizzes", value: profile?.quizzes_completed || 0, icon: <BookOpen className="w-5 h-5" /> },
    { label: "Doubts Helped", value: profile?.doubts_answered || 0, icon: <MessageCircle className="w-5 h-5" /> },
    { label: "Time Boosts", value: profile?.time_extension_count || 0, icon: <Timer className="w-5 h-5" /> },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary": return "border-warning text-warning bg-warning/20";
      case "epic": return "border-secondary text-secondary bg-secondary/20";
      case "rare": return "border-primary text-primary bg-primary/20";
      default: return "border-muted-foreground text-muted-foreground bg-muted/50";
    }
  };

  return (
    <PageLayout title="Personal" showPoints={false}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Profile Header with Banner */}
        <FadeIn>
          <GlassCard className="relative overflow-hidden">
            {/* Banner */}
            <div 
              className="h-24 bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent"
              style={(profile as any)?.banner_url ? {
                backgroundImage: `url(${(profile as any).banner_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : undefined}
            />
            
            <div className="p-6 pt-0 relative">
              {/* Avatar */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-[0_0_30px_hsl(217_91%_60%_/_0.3)] overflow-hidden -mt-10 border-4 border-background relative"
                style={profile?.accent_color ? {
                  background: `linear-gradient(135deg, hsl(${profile.accent_color}), hsl(262 83% 58%))`
                } : undefined}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.charAt(0) || "?"
                )}
                {/* Crown for animated avatar */}
                {(profile as any)?.animated_avatar_enabled && (
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2"
                  >
                    <Crown className="w-6 h-6 text-warning drop-shadow-[0_0_5px_hsl(45_93%_58%)]" />
                  </motion.div>
                )}
              </motion.div>
              
              {/* Settings button */}
              <Button 
                variant="ghost" 
                size="iconSm" 
                className="absolute top-4 right-4"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>

              {/* Profile Info */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile?.name}</h2>
                  {(profile as any)?.status && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                      {(profile as any).status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                {(profile as any)?.bio && (
                  <p className="text-sm mt-2">{(profile as any).bio}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <RankBadge rank={1} />
                  <StreakBadge count={profile?.streak || 0} />
                </div>
              </div>

              {/* Points Display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 mt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/20">
                    <Zap className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(profile?.points || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Points</p>
                  </div>
                </div>
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

        {/* Point Shop */}
        <FadeIn delay={0.15}>
          <h3 className="text-lg font-semibold mb-3">Point Shop</h3>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <GlassCard 
                  key={item.id}
                  hover 
                  className="p-4 cursor-pointer"
                  onClick={() => handlePurchaseClick(item.id)}
                >
                  <IconComponent className={`w-6 h-6 text-${item.color} mb-2`} />
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.price} pts • {item.duration}</p>
                </GlassCard>
              );
            })}
          </div>
        </FadeIn>

        {/* Goals */}
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">My Goals</h3>
            <Target className="w-5 h-5 text-primary" />
          </div>
          <GlassCard className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a new goal..."
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
              />
              <Button variant="gradient" size="icon" onClick={addGoal}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No goals yet. Add one above!</p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-muted/50 ${goal.completed ? "opacity-60" : ""}`}
                  >
                    <button onClick={() => toggleGoal(goal.id, goal.completed)}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        goal.completed ? "bg-success border-success" : "border-muted-foreground"
                      }`}>
                        {goal.completed && <Check className="w-3 h-3 text-success-foreground" />}
                      </div>
                    </button>
                    <span className={`flex-1 text-sm ${goal.completed ? "line-through" : ""}`}>
                      {goal.title}
                    </span>
                    <button onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </FadeIn>

        {/* To-Do List */}
        <FadeIn delay={0.25}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">To-Do List</h3>
            {todos.length > 0 && (
              <Button variant="ghost" size="sm" onClick={downloadTodosPDF}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
          <GlassCard className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a new task..."
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
              />
              <Button variant="outline" size="icon" onClick={addTodo}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {todos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks yet!</p>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl bg-muted/50 ${todo.completed ? "opacity-60" : ""}`}
                  >
                    <button onClick={() => toggleTodo(todo.id, todo.completed)}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        todo.completed ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {todo.completed && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                    <span className={`flex-1 text-sm ${todo.completed ? "line-through" : ""}`}>
                      {todo.title}
                    </span>
                    <button onClick={() => deleteTodo(todo.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </FadeIn>

        {/* Focus Sessions */}
        <FadeIn delay={0.28}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Focus Sessions</h3>
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <GlassCard className="p-4">
            {focusSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved sessions yet. Complete a focus session and save it!
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {focusSessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{session.session_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()} • {session.duration_minutes} min • {session.mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs font-medium">+{session.points_earned}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </FadeIn>

        {/* Badges */}
        <FadeIn delay={0.3}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Badges</h3>
            <span className="text-sm text-muted-foreground">
              {badges.filter(b => (profile?.points || 0) >= b.points_required).length}/{badges.length} earned
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.slice(0, 8).map((badge) => {
              const isEarned = (profile?.points || 0) >= badge.points_required;
              const progress = badge.points_required > 0 
                ? Math.min(100, ((profile?.points || 0) / badge.points_required) * 100)
                : 100;
              
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`p-3 rounded-xl text-center border ${
                        isEarned ? getRarityColor(badge.rarity) : "bg-muted/30 opacity-50 border-transparent"
                      }`}
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <p className="text-2xs mt-1 truncate">{badge.name}</p>
                      {!isEarned && badge.points_required > 0 && (
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    {!isEarned && (
                      <p className="text-xs text-primary mt-1">
                        {badge.points_required - (profile?.points || 0)} more points needed
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => setShowBadgesDialog(true)}
          >
            View All {badges.length} Badges
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </FadeIn>

        {/* Actions */}
        <FadeIn delay={0.35}>
          <GlassCard className="divide-y divide-border/50">
            {isAdmin && (
              <motion.button
                whileHover={{ backgroundColor: "hsl(var(--card-hover))" }}
                onClick={() => navigate("/admin")}
                className="w-full flex items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-warning" />
                  <span className="font-medium">Admin Panel</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ backgroundColor: "hsl(var(--card-hover))" }}
              onClick={() => setShowSettings(true)}
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
              onClick={handleLogout}
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

      {/* All Badges Dialog */}
      <Dialog open={showBadgesDialog} onOpenChange={setShowBadgesDialog}>
        <DialogContent className="glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Badges</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {badges.map((badge) => {
              const isEarned = (profile?.points || 0) >= badge.points_required;
              const progress = badge.points_required > 0 
                ? Math.min(100, ((profile?.points || 0) / badge.points_required) * 100)
                : 100;
              
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl text-center border ${
                    isEarned ? getRarityColor(badge.rarity) : "bg-muted/30 opacity-50 border-transparent"
                  }`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className="font-medium text-sm mt-2">{badge.name}</p>
                  <p className="text-2xs text-muted-foreground">{badge.description}</p>
                  {!isEarned && badge.points_required > 0 && (
                    <>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-2xs text-primary mt-1">
                        {badge.points_required - (profile?.points || 0)} pts needed
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!confirmPurchaseItem} onOpenChange={(open) => !open && setConfirmPurchaseItem(null)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {confirmPurchaseItem && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="p-3 rounded-xl bg-primary/20">
                  <confirmPurchaseItem.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{confirmPurchaseItem.name}</p>
                  <p className="text-sm text-muted-foreground">{confirmPurchaseItem.duration}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <span className="text-sm">Cost:</span>
                <span className="font-bold text-warning">{confirmPurchaseItem.price} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Your Balance:</span>
                <span>{profile?.points?.toLocaleString() || 0} pts</span>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setConfirmPurchaseItem(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  className="flex-1"
                  onClick={confirmPurchase}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accent Shop Dialog */}
      <Dialog open={showAccentShop} onOpenChange={setShowAccentShop}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Choose Accent Color</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ACCENT_COLORS.map((color) => (
              <motion.button
                key={color.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => purchaseAccent(color.value)}
                className="p-4 rounded-xl border border-border hover:border-primary transition-colors"
              >
                <div 
                  className="w-8 h-8 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: `hsl(${color.value})` }}
                />
                <p className="text-sm font-medium">{color.name}</p>
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Banner Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Set Custom Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Upload Banner Image</Label>
              <ImageUpload
                folder="banners"
                currentUrl={editBannerUrl}
                onUpload={(url) => setEditBannerUrl(url)}
                aspectRatio="banner"
                showUrlInput={true}
              />
            </div>
            {editBannerUrl && (
              <div 
                className="h-24 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${editBannerUrl})` }}
              />
            )}
            <Button variant="gradient" className="w-full" onClick={saveBanner}>
              Apply Banner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="glass-card max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-primary-foreground overflow-hidden"
                  style={profile?.accent_color ? {
                    background: `linear-gradient(135deg, hsl(${profile.accent_color}), hsl(262 83% 58%))`
                  } : undefined}
                >
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    editName?.charAt(0) || "?"
                  )}
                </div>
              </div>
            </div>
            
            {/* Name */}
            <div>
              <Label>Display Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Avatar Upload */}
            <div>
              <Label>Profile Picture</Label>
              <ImageUpload
                folder="avatars"
                currentUrl={editAvatarUrl}
                onUpload={(url) => setEditAvatarUrl(url)}
                aspectRatio="square"
                showUrlInput={true}
              />
            </div>
            
            {/* Bio */}
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="mt-1.5"
                rows={3}
              />
            </div>
            
            {/* Status */}
            <div>
              <Label>Status</Label>
              <Input
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                placeholder="📚 Studying..."
                className="mt-1.5"
              />
            </div>
            
            {/* Email (read-only) */}
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="font-medium text-sm">Email</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            
            <Button 
              variant="gradient" 
              className="w-full"
              onClick={saveSettings}
              disabled={!editName.trim() || savingSettings}
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default PersonalPage;
