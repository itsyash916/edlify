import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Gift, Timer, SkipForward, RotateCcw, Palette, Star, Sparkles } from "lucide-react";

interface LuckySpinProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SpinReward {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  weight: number;
  type: "points" | "powerup" | "theme" | "nothing";
  value?: number | string;
}

const SPIN_COST_REGULAR = 1000;
const SPIN_COST_PREMIUM = 2000;

const REGULAR_REWARDS: SpinReward[] = [
  { id: "points_100", name: "+100 Points", icon: <Zap className="w-5 h-5" />, color: "text-success", weight: 25, type: "points", value: 100 },
  { id: "points_200", name: "+200 Points", icon: <Zap className="w-5 h-5" />, color: "text-success", weight: 15, type: "points", value: 200 },
  { id: "points_500", name: "+500 Points", icon: <Star className="w-5 h-5" />, color: "text-warning", weight: 5, type: "points", value: 500 },
  { id: "time_ext", name: "+5s Timer", icon: <Timer className="w-5 h-5" />, color: "text-primary", weight: 15, type: "powerup", value: "time_extension" },
  { id: "skip", name: "Skip Question", icon: <SkipForward className="w-5 h-5" />, color: "text-secondary", weight: 12, type: "powerup", value: "skip_question" },
  { id: "retry", name: "Second Chance", icon: <RotateCcw className="w-5 h-5" />, color: "text-warning", weight: 8, type: "powerup", value: "second_chance" },
  { id: "theme_unlock", name: "Theme (3d)", icon: <Palette className="w-5 h-5" />, color: "text-pink-500", weight: 5, type: "theme", value: 3 },
  { id: "nothing", name: "Better Luck!", icon: <Gift className="w-5 h-5" />, color: "text-muted-foreground", weight: 15, type: "nothing" },
];

const PREMIUM_REWARDS: SpinReward[] = [
  { id: "points_300", name: "+300 Points", icon: <Zap className="w-5 h-5" />, color: "text-success", weight: 20, type: "points", value: 300 },
  { id: "points_500", name: "+500 Points", icon: <Star className="w-5 h-5" />, color: "text-warning", weight: 18, type: "points", value: 500 },
  { id: "points_1000", name: "+1000 Points", icon: <Sparkles className="w-5 h-5" />, color: "text-warning", weight: 8, type: "points", value: 1000 },
  { id: "time_ext_2", name: "+5s Timer x2", icon: <Timer className="w-5 h-5" />, color: "text-primary", weight: 12, type: "powerup", value: "time_extension_2" },
  { id: "skip_2", name: "Skip x2", icon: <SkipForward className="w-5 h-5" />, color: "text-secondary", weight: 10, type: "powerup", value: "skip_question_2" },
  { id: "retry_2", name: "2nd Chance x2", icon: <RotateCcw className="w-5 h-5" />, color: "text-warning", weight: 8, type: "powerup", value: "second_chance_2" },
  { id: "theme_unlock_7", name: "Theme (7d)", icon: <Palette className="w-5 h-5" />, color: "text-pink-500", weight: 12, type: "theme", value: 7 },
  { id: "nothing", name: "Better Luck!", icon: <Gift className="w-5 h-5" />, color: "text-muted-foreground", weight: 12, type: "nothing" },
];

const WHEEL_COLORS = [
  "from-primary to-primary/80",
  "from-secondary to-secondary/80",
  "from-success to-success/80",
  "from-warning to-warning/80",
  "from-pink-500 to-pink-500/80",
  "from-cyan-500 to-cyan-500/80",
  "from-emerald-500 to-emerald-500/80",
  "from-rose-500 to-rose-500/80",
];

export const LuckySpin = ({ open, onOpenChange }: LuckySpinProps) => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinReward | null>(null);
  const [spinType, setSpinType] = useState<"regular" | "premium">("regular");
  const spinRef = useRef<HTMLDivElement>(null);

  const rewards = spinType === "regular" ? REGULAR_REWARDS : PREMIUM_REWARDS;
  const spinCost = spinType === "regular" ? SPIN_COST_REGULAR : SPIN_COST_PREMIUM;

  const getWeightedReward = (): SpinReward => {
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const reward of rewards) {
      random -= reward.weight;
      if (random <= 0) return reward;
    }
    return rewards[rewards.length - 1];
  };

  const applyReward = async (reward: SpinReward) => {
    if (!profile?.id) return;

    switch (reward.type) {
      case "points":
        await updatePoints(reward.value as number, "lucky_spin", `Won ${reward.value} points from Lucky Spin`);
        break;
      
      case "powerup":
        const powerupType = reward.value as string;
        const count = powerupType.includes("_2") ? 2 : 1;
        const basePowerup = powerupType.replace("_2", "");
        
        if (basePowerup === "time_extension") {
          await supabase
            .from("profiles")
            .update({ time_extension_count: (profile.time_extension_count || 0) + count })
            .eq("id", profile.id);
        } else if (basePowerup === "skip_question") {
          await supabase
            .from("profiles")
            .update({ skip_question_count: ((profile as any).skip_question_count || 0) + count } as any)
            .eq("id", profile.id);
        } else if (basePowerup === "second_chance") {
          await supabase
            .from("profiles")
            .update({ second_chance_count: ((profile as any).second_chance_count || 0) + count } as any)
            .eq("id", profile.id);
        }
        break;
      
      case "theme":
        const days = reward.value as number;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        
        await supabase
          .from("profiles")
          .update({ gradient_theme_expires_at: expiresAt.toISOString() } as any)
          .eq("id", profile.id);
        break;
      
      case "nothing":
        // No reward
        break;
    }

    // Record spin history
    await supabase.from("lucky_spin_history").insert({
      user_id: profile.id,
      reward_type: reward.id,
      reward_value: reward.type === "points" ? String(reward.value) : reward.name,
      points_spent: spinCost,
    });
  };

  const spin = async () => {
    if (!profile || profile.points < spinCost) {
      toast.error(`Not enough points! You need ${spinCost} points.`);
      return;
    }

    setSpinning(true);
    setResult(null);

    // Deduct points first
    await updatePoints(-spinCost, "lucky_spin_cost", `Lucky Spin cost`);

    const reward = getWeightedReward();
    const rewardIndex = rewards.findIndex(r => r.id === reward.id);
    const segmentAngle = 360 / rewards.length;
    
    // Calculate final rotation to land on the reward
    const baseRotation = 360 * 5; // 5 full spins
    const targetAngle = segmentAngle * rewardIndex + segmentAngle / 2;
    const finalRotation = baseRotation + (360 - targetAngle);
    
    setRotation(prev => prev + finalRotation);

    // Wait for animation to complete
    setTimeout(async () => {
      setResult(reward);
      await applyReward(reward);
      await refreshProfile();
      setSpinning(false);

      if (reward.type === "nothing") {
        toast.info("Better luck next time! 🎲");
      } else {
        toast.success(`You won: ${reward.name}! 🎉`);
      }
    }, 4000);
  };

  const resetAndClose = () => {
    setResult(null);
    setRotation(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning" />
            Lucky Spin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Spin Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={spinType === "regular" ? "gradient" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSpinType("regular")}
              disabled={spinning}
            >
              Regular ({SPIN_COST_REGULAR} pts)
            </Button>
            <Button
              variant={spinType === "premium" ? "gradient" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSpinType("premium")}
              disabled={spinning}
            >
              Premium ({SPIN_COST_PREMIUM} pts)
            </Button>
          </div>

          {/* Wheel */}
          <div className="relative w-64 h-64 mx-auto">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-warning drop-shadow-lg" />
            </div>

            {/* Wheel */}
            <motion.div
              ref={spinRef}
              className="w-full h-full rounded-full relative overflow-hidden shadow-2xl border-4 border-border"
              style={{ rotate: rotation }}
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {rewards.map((reward, i) => {
                const angle = (360 / rewards.length) * i;
                const skewAngle = 90 - 360 / rewards.length;
                
                return (
                  <div
                    key={reward.id + i}
                    className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br ${WHEEL_COLORS[i % WHEEL_COLORS.length]}`}
                    style={{
                      transform: `rotate(${angle}deg) skewY(${skewAngle}deg)`,
                      left: 0,
                      top: 0,
                    }}
                  >
                    <div
                      className="absolute text-white text-xs font-medium flex items-center gap-1"
                      style={{
                        transform: `skewY(${-skewAngle}deg) rotate(${360 / rewards.length / 2}deg)`,
                        left: "50%",
                        top: "20%",
                        transformOrigin: "left center",
                      }}
                    >
                      {reward.icon}
                    </div>
                  </div>
                );
              })}
              
              {/* Center */}
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-background border-4 border-border flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6 text-warning" />
              </div>
            </motion.div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard className="p-4 text-center">
                  <div className={`text-4xl mb-2 ${result.color}`}>
                    {result.icon}
                  </div>
                  <p className="text-lg font-bold">{result.name}</p>
                  {result.type === "theme" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Go to Settings to customize your theme!
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin Button */}
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={spin}
            disabled={spinning || !profile || profile.points < spinCost}
          >
            {spinning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Spin ({spinCost} pts)
              </>
            )}
          </Button>

          {/* Points Display */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-success" />
            <span>Your Points: {profile?.points?.toLocaleString() || 0}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
