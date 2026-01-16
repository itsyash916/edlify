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
  bgColor: string;
  type: "points" | "powerup" | "theme" | "nothing";
  value?: number | string;
}

const SPIN_COST_REGULAR = 1000;
const SPIN_COST_PREMIUM = 2000;

// Equal probability - no weights, pure random
const REGULAR_REWARDS: SpinReward[] = [
  { id: "points_100", name: "+100 Pts", icon: <Zap className="w-4 h-4" />, color: "#10b981", bgColor: "#10b981", type: "points", value: 100 },
  { id: "points_200", name: "+200 Pts", icon: <Zap className="w-4 h-4" />, color: "#22c55e", bgColor: "#22c55e", type: "points", value: 200 },
  { id: "points_500", name: "+500 Pts", icon: <Star className="w-4 h-4" />, color: "#eab308", bgColor: "#eab308", type: "points", value: 500 },
  { id: "time_ext", name: "+5s Timer", icon: <Timer className="w-4 h-4" />, color: "#8b5cf6", bgColor: "#8b5cf6", type: "powerup", value: "time_extension" },
  { id: "skip", name: "Skip Q", icon: <SkipForward className="w-4 h-4" />, color: "#06b6d4", bgColor: "#06b6d4", type: "powerup", value: "skip_question" },
  { id: "retry", name: "2nd Chance", icon: <RotateCcw className="w-4 h-4" />, color: "#f97316", bgColor: "#f97316", type: "powerup", value: "second_chance" },
  { id: "theme_unlock", name: "Theme 3d", icon: <Palette className="w-4 h-4" />, color: "#ec4899", bgColor: "#ec4899", type: "theme", value: 3 },
  { id: "nothing", name: "Try Again", icon: <Gift className="w-4 h-4" />, color: "#6b7280", bgColor: "#6b7280", type: "nothing" },
];

// Premium rewards - NO "Better Luck" option, increased rewards
const PREMIUM_REWARDS: SpinReward[] = [
  { id: "points_500", name: "+500 Pts", icon: <Zap className="w-4 h-4" />, color: "#22c55e", bgColor: "#22c55e", type: "points", value: 500 },
  { id: "points_1000", name: "+1000 Pts", icon: <Star className="w-4 h-4" />, color: "#eab308", bgColor: "#eab308", type: "points", value: 1000 },
  { id: "points_2000", name: "+2000 Pts", icon: <Sparkles className="w-4 h-4" />, color: "#f59e0b", bgColor: "#f59e0b", type: "points", value: 2000 },
  { id: "time_ext_3", name: "+5s x3", icon: <Timer className="w-4 h-4" />, color: "#8b5cf6", bgColor: "#8b5cf6", type: "powerup", value: "time_extension_3" },
  { id: "skip_3", name: "Skip x3", icon: <SkipForward className="w-4 h-4" />, color: "#06b6d4", bgColor: "#06b6d4", type: "powerup", value: "skip_question_3" },
  { id: "retry_3", name: "2nd x3", icon: <RotateCcw className="w-4 h-4" />, color: "#f97316", bgColor: "#f97316", type: "powerup", value: "second_chance_3" },
  { id: "theme_unlock_14", name: "Theme 14d", icon: <Palette className="w-4 h-4" />, color: "#ec4899", bgColor: "#ec4899", type: "theme", value: 14 },
  { id: "theme_unlock_30", name: "Theme 30d", icon: <Palette className="w-4 h-4" />, color: "#d946ef", bgColor: "#d946ef", type: "theme", value: 30 },
];

export const LuckySpin = ({ open, onOpenChange }: LuckySpinProps) => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinReward | null>(null);
  const [spinType, setSpinType] = useState<"regular" | "premium">("regular");
  const wheelRef = useRef<HTMLDivElement>(null);

  const rewards = spinType === "regular" ? REGULAR_REWARDS : PREMIUM_REWARDS;
  const spinCost = spinType === "regular" ? SPIN_COST_REGULAR : SPIN_COST_PREMIUM;

  // Equal probability random selection
  const getRandomReward = (): SpinReward => {
    const randomIndex = Math.floor(Math.random() * rewards.length);
    return rewards[randomIndex];
  };

  const applyReward = async (reward: SpinReward) => {
    if (!profile?.id) return;

    switch (reward.type) {
      case "points":
        await updatePoints(reward.value as number, "lucky_spin", `Won ${reward.value} points from Lucky Spin`);
        break;
      
      case "powerup":
        const powerupType = reward.value as string;
        const count = powerupType.includes("_3") ? 3 : powerupType.includes("_2") ? 2 : 1;
        const basePowerup = powerupType.replace("_3", "").replace("_2", "");
        
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

    const reward = getRandomReward();
    const rewardIndex = rewards.findIndex(r => r.id === reward.id);
    const segmentAngle = 360 / rewards.length;
    
    // Calculate final rotation to land on the reward
    const baseRotation = 360 * 6; // 6 full spins
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

  const segmentAngle = 360 / rewards.length;

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

          {/* Wheel with Labels */}
          <div className="relative w-72 h-72 mx-auto">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-warning drop-shadow-lg" />
            </div>

            {/* Wheel */}
            <motion.div
              ref={wheelRef}
              className="w-full h-full rounded-full relative shadow-2xl border-4 border-border overflow-hidden"
              style={{ rotate: rotation }}
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {/* SVG Wheel */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {rewards.map((reward, i) => {
                  const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
                  const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
                  
                  const x1 = 100 + 100 * Math.cos(startAngle);
                  const y1 = 100 + 100 * Math.sin(startAngle);
                  const x2 = 100 + 100 * Math.cos(endAngle);
                  const y2 = 100 + 100 * Math.sin(endAngle);
                  
                  const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                  
                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                  
                  // Label position
                  const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
                  const labelX = 100 + 60 * Math.cos(midAngle);
                  const labelY = 100 + 60 * Math.sin(midAngle);
                  const textRotation = (i + 0.5) * segmentAngle;
                  
                  return (
                    <g key={reward.id + i}>
                      <path d={pathData} fill={reward.bgColor} stroke="#1f2937" strokeWidth="1" />
                      <text
                        x={labelX}
                        y={labelY}
                        fill="white"
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation}, ${labelX}, ${labelY})`}
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                      >
                        {reward.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
              
              {/* Center */}
              <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-background border-4 border-border flex items-center justify-center shadow-inner z-10">
                <Sparkles className="w-5 h-5 text-warning" />
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
                  <div className="text-4xl mb-2" style={{ color: result.color }}>
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
