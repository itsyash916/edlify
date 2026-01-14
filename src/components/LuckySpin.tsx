import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift, Zap, Timer, SkipForward, RotateCcw, Sparkles, Image as ImageIcon, Trophy, Frown } from "lucide-react";

const REWARDS = [
  { id: "points_500", name: "+500 Points", icon: Zap, color: "from-green-500 to-emerald-600", weight: 20 },
  { id: "points_2000", name: "+2000 Points", icon: Trophy, color: "from-yellow-400 to-amber-600", weight: 5 },
  { id: "time_ext", name: "+5 Seconds", icon: Timer, color: "from-orange-500 to-red-600", weight: 15 },
  { id: "skip", name: "Skip Question", icon: SkipForward, color: "from-blue-500 to-indigo-600", weight: 15 },
  { id: "retry", name: "Second Chance", icon: RotateCcw, color: "from-purple-500 to-pink-600", weight: 12 },
  { id: "animated_avatar", name: "Animated Avatar (7d)", icon: Sparkles, color: "from-pink-500 to-rose-600", weight: 8 },
  { id: "theme", name: "Theme Color (7d)", icon: ImageIcon, color: "from-cyan-500 to-teal-600", weight: 10 },
  { id: "nothing", name: "Better Luck Next Time", icon: Frown, color: "from-gray-500 to-slate-600", weight: 15 },
];

interface LuckySpinProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeWon?: () => void;
}

export const LuckySpin = ({ isOpen, onClose, onThemeWon }: LuckySpinProps) => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<typeof REWARDS[0] | null>(null);
  const [rotation, setRotation] = useState(0);

  const SPIN_COST = 1000;

  const getWeightedRandomReward = () => {
    const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const reward of REWARDS) {
      random -= reward.weight;
      if (random <= 0) return reward;
    }
    return REWARDS[REWARDS.length - 1];
  };

  const spin = async () => {
    if (!profile || profile.points < SPIN_COST || isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // Deduct points first
    await updatePoints(-SPIN_COST, "lucky_spin", "Lucky Spin");

    // Get random reward
    const reward = getWeightedRandomReward();
    const rewardIndex = REWARDS.indexOf(reward);
    
    // Calculate rotation (multiple full spins + land on reward)
    const segmentAngle = 360 / REWARDS.length;
    const targetAngle = rewardIndex * segmentAngle;
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const newRotation = rotation + (spins * 360) + (360 - targetAngle);
    
    setRotation(newRotation);

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Apply reward
    await applyReward(reward);

    // Record spin history
    await supabase.from("lucky_spin_history").insert({
      user_id: profile.id,
      reward_type: reward.id,
      reward_value: reward.name,
      points_spent: SPIN_COST,
    });

    setResult(reward);
    setIsSpinning(false);
    await refreshProfile();
  };

  const applyReward = async (reward: typeof REWARDS[0]) => {
    if (!profile) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    switch (reward.id) {
      case "points_500":
        await updatePoints(500, "lucky_spin_win", "Lucky Spin: +500 Points");
        break;
      case "points_2000":
        await updatePoints(2000, "lucky_spin_win", "Lucky Spin: +2000 Points JACKPOT!");
        break;
      case "time_ext":
        await supabase
          .from("profiles")
          .update({ time_extension_count: (profile.time_extension_count || 0) + 1 })
          .eq("id", profile.id);
        break;
      case "skip":
        await supabase
          .from("profiles")
          .update({ skip_question_count: ((profile as any).skip_question_count || 0) + 1 })
          .eq("id", profile.id);
        break;
      case "retry":
        await supabase
          .from("profiles")
          .update({ second_chance_count: ((profile as any).second_chance_count || 0) + 1 })
          .eq("id", profile.id);
        break;
      case "animated_avatar":
        await supabase
          .from("profiles")
          .update({ 
            animated_avatar_enabled: true,
            animated_avatar_expires_at: expiresAt.toISOString()
          })
          .eq("id", profile.id);
        break;
      case "theme":
        await supabase
          .from("profiles")
          .update({ accent_expires_at: expiresAt.toISOString() })
          .eq("id", profile.id);
        onThemeWon?.();
        break;
      case "nothing":
        // No reward
        break;
    }
  };

  const handleClose = () => {
    if (!isSpinning) {
      setResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Lucky Spin
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Wheel */}
          <div className="relative w-64 h-64">
            {/* Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
            </div>
            
            {/* Wheel */}
            <motion.div
              className="w-full h-full rounded-full border-4 border-primary/30 overflow-hidden relative"
              style={{ rotate: rotation }}
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {REWARDS.map((reward, index) => {
                const segmentAngle = 360 / REWARDS.length;
                const rotation = index * segmentAngle;
                const IconComponent = reward.icon;
                
                return (
                  <div
                    key={reward.id}
                    className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br ${reward.color}`}
                    style={{
                      transform: `rotate(${rotation}deg) skewY(${90 - segmentAngle}deg)`,
                      transformOrigin: "100% 100%",
                      left: 0,
                      top: 0,
                    }}
                  >
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        transform: `skewY(${segmentAngle - 90}deg) rotate(${segmentAngle / 2}deg)`,
                        left: "60%",
                        top: "30%",
                      }}
                    >
                      <IconComponent className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  </div>
                );
              })}
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </motion.div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${result.color} text-white text-center`}
              >
                <result.icon className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold text-lg">{result.name}</p>
                {result.id === "nothing" ? (
                  <p className="text-sm opacity-80">Try again!</p>
                ) : result.id === "points_2000" ? (
                  <p className="text-sm opacity-80">🎉 JACKPOT! 🎉</p>
                ) : (
                  <p className="text-sm opacity-80">Added to your account!</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info & Button */}
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Your Points:</span>
              <span className="font-bold">{profile?.points?.toLocaleString() || 0}</span>
            </div>
            
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={spin}
              disabled={!profile || profile.points < SPIN_COST || isSpinning}
            >
              {isSpinning ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Spinning...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Spin for {SPIN_COST} Points
                </span>
              )}
            </Button>
            
            {profile && profile.points < SPIN_COST && (
              <p className="text-xs text-center text-destructive">
                You need {SPIN_COST - profile.points} more points to spin!
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
