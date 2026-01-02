import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/progress";
import { FadeIn } from "@/components/ui/animations";
import { useAuth } from "@/hooks/useAuth";
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
  Zap
} from "lucide-react";
import { toast } from "sonner";

type SessionMode = "focus" | "break" | "infinite";
type TimerState = "idle" | "running" | "paused" | "completed";

const MODES = {
  short: { focus: 25, break: 5, label: "25/5", completionBonus: 200, thirtyMinBonus: 0 },
  long: { focus: 50, break: 10, label: "50/10", completionBonus: 500, thirtyMinBonus: 0 },
  infinite: { focus: 0, break: 0, label: "∞", completionBonus: 0, thirtyMinBonus: 250 },
};

const PomodoroPage = () => {
  const { profile, updatePoints, refreshProfile } = useAuth();
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const mode = MODES[selectedMode];
  const totalTime = sessionMode === "focus" ? mode.focus * 60 : mode.break * 60;
  const isInfinite = selectedMode === "infinite";

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
    setTimerState("idle");
    setSessionMode("focus");
    setTimeLeft(isInfinite ? 0 : mode.focus * 60);
    setTotalFocusTime(0);
    setLastMinuteAwarded(0);
    setThirtyMinBonusesAwarded(0);
    setMinutesStudied(0);
    refreshProfile();
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

  return (
    <PageLayout title="Focus" points={profile?.points || 0}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Mode Selector */}
        <FadeIn>
          <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
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
          <GlassCard className="p-3 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">
                {selectedMode === "short" && "Earn 1 pt/min + 200 bonus on completion"}
                {selectedMode === "long" && "Earn 1 pt/min + 500 bonus on completion"}
                {selectedMode === "infinite" && "Earn 1 pt/min + 250 bonus every 30 mins"}
              </span>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Timer Display */}
        <FadeIn delay={0.1}>
          <GlassCard className="p-8 flex flex-col items-center">
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
                onClick={() => setShowMusic(!showMusic)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  showMusic ? "bg-primary/20 text-primary" : "bg-muted hover:bg-muted/80"
                )}
              >
                {musicPlaying ? <Music2 className="w-5 h-5" /> : <Music className="w-5 h-5" />}
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
                <GlassCard className="p-4">
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
            <GlassCard className="p-4 text-center">
              <CheckCircle className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-xl font-bold">{sessionsCompleted}</p>
              <p className="text-2xs text-muted-foreground">Sessions</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold">{Math.floor((profile?.total_study_minutes || 0) / 60)}h</p>
              <p className="text-2xs text-muted-foreground">Total</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Zap className="w-5 h-5 text-warning mx-auto mb-2" />
              <p className="text-xl font-bold">{profile?.streak || 0}</p>
              <p className="text-2xs text-muted-foreground">Streak</p>
            </GlassCard>
          </div>
        </FadeIn>

        {/* Tips */}
        <FadeIn delay={0.3}>
          <GlassCard className="p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Complete full sessions for bonus points! Each minute earns 1 point automatically.
            </p>
          </GlassCard>
        </FadeIn>
      </div>
    </PageLayout>
  );
};

export default PomodoroPage;
