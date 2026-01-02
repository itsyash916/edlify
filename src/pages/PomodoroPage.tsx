import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularProgress } from "@/components/ui/progress";
import { FadeIn } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
import { useMusic } from "@/contexts/MusicContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  RotateCcw,
  Coffee,
  Music,
  Music2,
  CheckCircle,
  Clock,
  Flame,
  Zap,
  Image as ImageIcon,
  Loader2,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SessionMode = "focus" | "break" | "infinite";
type TimerState = "idle" | "running" | "paused" | "completed";

const MODES = {
  short: { focus: 25, break: 5, label: "25/5", completionBonus: 200, thirtyMinBonus: 0 },
  long: { focus: 50, break: 10, label: "50/10", completionBonus: 500, thirtyMinBonus: 0 },
  infinite: { focus: 0, break: 0, label: "∞", completionBonus: 0, thirtyMinBonus: 250 },
};

const DEFAULT_BACKGROUNDS = [
  { name: "Dark Gradient", value: "", preview: "bg-gradient-to-br from-background to-muted" },
  { name: "Cozy Cafe", value: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=80", preview: "" },
  { name: "Mountain View", value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80", preview: "" },
  { name: "Night City", value: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80", preview: "" },
  { name: "Forest", value: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80", preview: "" },
  { name: "Ocean", value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80", preview: "" },
];

const PomodoroPage = () => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const { startMusicFromPomodoro, isMusicPlaying } = useMusic();
  const [selectedMode, setSelectedMode] = useState<"short" | "long" | "infinite">("short");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [sessionMode, setSessionMode] = useState<SessionMode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODES.short.focus * 60);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showMusic, setShowMusic] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [minutesStudied, setMinutesStudied] = useState(0);
  const [lastMinuteAwarded, setLastMinuteAwarded] = useState(0);
  const [thirtyMinBonusesAwarded, setThirtyMinBonusesAwarded] = useState(0);
  const [showBgDialog, setShowBgDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [purchasingBg, setPurchasingBg] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const mode = MODES[selectedMode];
  const totalTime = sessionMode === "focus" ? mode.focus * 60 : mode.break * 60;
  const isInfinite = selectedMode === "infinite";

  useEffect(() => {
    // Load custom background from profile
    if (profile) {
      const bgUrl = (profile as any).pomodoro_bg_url;
      const bgExpires = (profile as any).pomodoro_bg_expires_at;
      
      if (bgUrl && bgExpires && new Date(bgExpires) > new Date()) {
        setBackgroundUrl(bgUrl);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (timerState === "running" && sessionMode === "focus") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (!isInfinite && prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return isInfinite ? prev + 1 : prev - 1;
        });
        
        setTotalFocusTime((t) => {
          const newTotal = t + 1;
          
          // Award 1 point per minute studied
          const currentMinute = Math.floor(newTotal / 60);
          if (currentMinute > lastMinuteAwarded && sessionMode === "focus") {
            setMinutesStudied(m => m + 1);
            setLastMinuteAwarded(currentMinute);
            
            // Award 1 point per minute
            awardPoints(1, "pomodoro_minute", "1 point for 1 minute studied");
            
            // In infinite mode, give 250 bonus points every 30 minutes
            if (isInfinite && currentMinute > 0 && currentMinute % 30 === 0) {
              const bonusNumber = Math.floor(currentMinute / 30);
              if (bonusNumber > thirtyMinBonusesAwarded) {
                setThirtyMinBonusesAwarded(bonusNumber);
                awardPoints(mode.thirtyMinBonus, "pomodoro_infinite_bonus", `250 bonus points for ${currentMinute} minutes in infinite mode`);
                toast.success(`+${mode.thirtyMinBonus} bonus points for 30 minutes!`);
              }
            }
          }
          
          return newTotal;
        });
      }, 1000);
    } else if (timerState === "running" && sessionMode === "break") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleBreakComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, isInfinite, sessionMode, lastMinuteAwarded, thirtyMinBonusesAwarded]);

  const awardPoints = async (amount: number, type: string, description: string) => {
    await updatePoints(amount, type, description);
  };

  const handleSessionComplete = async () => {
    if (sessionMode === "focus") {
      const minutesStudied = mode.focus;
      
      // Update study minutes in database
      if (profile?.id) {
        await supabase
          .from("profiles")
          .update({ 
            total_study_minutes: (profile.total_study_minutes || 0) + minutesStudied 
          })
          .eq("id", profile.id);
      }
      
      // Award completion bonus
      await awardPoints(mode.completionBonus, "pomodoro_completion", `${mode.completionBonus} points for completing ${minutesStudied} min session`);
      toast.success(`Session complete! +${mode.completionBonus} bonus points!`);
      
      setSessionsCompleted((prev) => prev + 1);
      
      // Switch to break
      setSessionMode("break");
      setTimeLeft(mode.break * 60);
    }
    setTimerState("idle");
  };

  const handleBreakComplete = () => {
    setSessionMode("focus");
    setTimeLeft(mode.focus * 60);
    setTimerState("idle");
    toast.info("Break over! Ready for another session?");
  };

  const startTimer = () => {
    if (timerState === "idle") {
      if (!isInfinite) {
        setTimeLeft(sessionMode === "focus" ? mode.focus * 60 : mode.break * 60);
      } else {
        setTimeLeft(0);
        setTotalFocusTime(0);
        setLastMinuteAwarded(0);
        setThirtyMinBonusesAwarded(0);
      }
    }
    setTimerState("running");
  };

  const pauseTimer = () => {
    setTimerState("paused");
  };

  const resetTimer = () => {
    // Show save dialog if there's study time to save
    if (totalFocusTime >= 60 && sessionMode === "focus") {
      setShowSaveDialog(true);
      return;
    }
    performReset();
  };

  const performReset = () => {
    setTimerState("idle");
    setSessionMode("focus");
    setTimeLeft(isInfinite ? 0 : mode.focus * 60);
    setTotalFocusTime(0);
    setLastMinuteAwarded(0);
    setThirtyMinBonusesAwarded(0);
    setMinutesStudied(0);
    refreshProfile();
  };

  const saveSession = async () => {
    if (!profile?.id || !sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    setSavingSession(true);
    const durationMinutes = Math.floor(totalFocusTime / 60);
    
    const { error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: profile.id,
        session_name: sessionName.trim(),
        duration_minutes: durationMinutes,
        mode: selectedMode,
        points_earned: minutesStudied
      });

    if (error) {
      toast.error("Failed to save session");
    } else {
      toast.success(`Session "${sessionName}" saved!`);
    }
    
    setSavingSession(false);
    setShowSaveDialog(false);
    setSessionName("");
    performReset();
  };

  const skipSave = () => {
    setShowSaveDialog(false);
    setSessionName("");
    performReset();
  };

  // Start floating music when playing music here
  const handleMusicToggle = () => {
    if (!musicPlaying) {
      setMusicPlaying(true);
      startMusicFromPomodoro();
    } else {
      setMusicPlaying(false);
    }
    setShowMusic(!showMusic);
  };

  const selectMode = (newMode: "short" | "long" | "infinite") => {
    if (timerState !== "idle") return;
    setSelectedMode(newMode);
    setTimeLeft(MODES[newMode].focus * 60);
    setSessionMode("focus");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (sessionMode === "break") return "success";
    if (timerState === "running") return "primary";
    return "secondary";
  };

  const purchaseBackground = async (bgUrl: string) => {
    if (!profile) return;
    
    if (profile.points < 50) {
      toast.error("Not enough points! You need 50 points.");
      return;
    }
    
    setPurchasingBg(true);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    
    await updatePoints(-50, "pomodoro_bg", "Purchased custom Pomodoro background for 24h");
    
    await supabase
      .from("profiles")
      .update({
        pomodoro_bg_url: bgUrl,
        pomodoro_bg_expires_at: expiresAt.toISOString()
      } as any)
      .eq("id", profile.id);
    
    setBackgroundUrl(bgUrl);
    await refreshProfile();
    setShowBgDialog(false);
    setPurchasingBg(false);
    toast.success("Background applied for 24 hours!");
  };

  return (
    <PageLayout title="Focus" points={profile?.points || 0}>
      {/* Custom Background */}
      {backgroundUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </div>
      )}
      
      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        {/* Mode Selector */}
        <FadeIn>
          <div className="flex gap-2 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
            {(Object.keys(MODES) as Array<keyof typeof MODES>).map((key) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectMode(key)}
                disabled={timerState !== "idle"}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                  selectedMode === key
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                  timerState !== "idle" && "opacity-50 cursor-not-allowed"
                )}
              >
                {MODES[key].label}
              </motion.button>
            ))}
          </div>
        </FadeIn>

        {/* Points Info */}
        <FadeIn delay={0.05}>
          <GlassCard className="p-3 border-primary/20 bg-primary/5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  {selectedMode === "short" && "Earn 1 pt/min + 200 bonus on completion"}
                  {selectedMode === "long" && "Earn 1 pt/min + 500 bonus on completion"}
                  {selectedMode === "infinite" && "Earn 1 pt/min + 250 bonus every 30 mins"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBgDialog(true)}
                className="text-xs"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                BG
              </Button>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Timer Display */}
        <FadeIn delay={0.1}>
          <GlassCard className="p-8 flex flex-col items-center backdrop-blur-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={sessionMode}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-4 flex items-center gap-2"
              >
                {sessionMode === "focus" ? (
                  <>
                    <Flame className="w-5 h-5 text-primary" />
                    <span className="text-lg font-semibold text-primary">Focus Time</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-5 h-5 text-success" />
                    <span className="text-lg font-semibold text-success">Break Time</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="relative mb-8">
              {!isInfinite ? (
                <CircularProgress
                  value={timeLeft}
                  max={totalTime}
                  size={220}
                  strokeWidth={10}
                  color={getTimerColor()}
                  showValue={false}
                />
              ) : (
                <div className="w-[220px] h-[220px] rounded-full border-[10px] border-muted flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 w-full h-full rounded-full border-[10px] border-transparent" 
                    style={{ 
                      borderTopColor: "hsl(var(--primary))",
                      animation: timerState === "running" ? "spin 2s linear infinite" : "none"
                    }} 
                  />
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  key={timeLeft}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold tabular-nums"
                >
                  {formatTime(isInfinite ? totalFocusTime : timeLeft)}
                </motion.span>
                {isInfinite && timerState === "running" && (
                  <span className="text-sm text-muted-foreground mt-1">Infinite Mode</span>
                )}
                {timerState === "running" && sessionMode === "focus" && (
                  <span className="text-xs text-primary mt-1">+{minutesStudied} pts earned</span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={resetTimer}
                className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={timerState === "running" ? pauseTimer : startTimer}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  "bg-gradient-to-r from-primary to-secondary",
                  "shadow-[0_0_30px_hsl(217_91%_60%_/_0.4)]",
                  "hover:shadow-[0_0_40px_hsl(217_91%_60%_/_0.5)]",
                  "transition-shadow"
                )}
              >
                {timerState === "running" ? (
                  <Pause className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Play className="w-7 h-7 text-primary-foreground ml-1" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleMusicToggle}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  (showMusic || isMusicPlaying) ? "bg-primary/20 text-primary" : "bg-muted hover:bg-muted/80"
                )}
              >
                {(musicPlaying || isMusicPlaying) ? <Music2 className="w-5 h-5" /> : <Music className="w-5 h-5" />}
              </motion.button>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Music Player */}
        <AnimatePresence>
          {showMusic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FadeIn>
                <GlassCard className="p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Lofi Music</span>
                    <Button
                      variant={musicPlaying ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setMusicPlaying(!musicPlaying)}
                    >
                      {musicPlaying ? "Pause" : "Play"}
                    </Button>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    {musicPlaying && (
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0"
                        title="Lofi Music"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="border-0"
                      />
                    )}
                    {!musicPlaying && (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Music className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </GlassCard>
              </FadeIn>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-4 text-center backdrop-blur-md">
              <CheckCircle className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-xl font-bold">{sessionsCompleted}</p>
              <p className="text-2xs text-muted-foreground">Sessions</p>
            </GlassCard>
            <GlassCard className="p-4 text-center backdrop-blur-md">
              <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold">{Math.floor((profile?.total_study_minutes || 0) / 60)}h</p>
              <p className="text-2xs text-muted-foreground">Total</p>
            </GlassCard>
            <GlassCard className="p-4 text-center backdrop-blur-md">
              <Zap className="w-5 h-5 text-warning mx-auto mb-2" />
              <p className="text-xl font-bold">{profile?.streak || 0}</p>
              <p className="text-2xs text-muted-foreground">Streak</p>
            </GlassCard>
          </div>
        </FadeIn>

        {/* Tips */}
        <FadeIn delay={0.3}>
          <GlassCard className="p-4 backdrop-blur-md">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Complete full sessions for bonus points! Each minute earns 1 point automatically.
            </p>
          </GlassCard>
        </FadeIn>
      </div>

      {/* Background Dialog */}
      <Dialog open={showBgDialog} onOpenChange={setShowBgDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Choose Background (50 pts for 24h)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_BACKGROUNDS.map((bg) => (
                <motion.button
                  key={bg.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => bg.value && purchaseBackground(bg.value)}
                  disabled={purchasingBg}
                  className="relative h-24 rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  {bg.value ? (
                    <img 
                      src={bg.value} 
                      alt={bg.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${bg.preview}`} />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{bg.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label>Custom URL</Label>
              <div className="flex gap-2">
                <Input
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button 
                  onClick={() => customBgUrl && purchaseBackground(customBgUrl)}
                  disabled={!customBgUrl || purchasingBg}
                >
                  {purchasingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              You have {profile?.points || 0} points available
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Session Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Save Focus Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{Math.floor(totalFocusTime / 60)} minutes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-medium capitalize">{selectedMode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Points Earned</span>
                <span className="font-medium text-primary">+{minutesStudied}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Session Name</Label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Math Study, Physics Revision..."
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={skipSave}
              >
                Skip
              </Button>
              <Button 
                className="flex-1"
                onClick={saveSession}
                disabled={!sessionName.trim() || savingSession}
              >
                {savingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default PomodoroPage;
