import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPIN_COST = 1000;

const REWARDS = [
  { id: "points_2000", name: "2000 Points", icon: "💰", color: "from-yellow-500 to-amber-500" },
  { id: "points_500", name: "500 Points", icon: "💵", color: "from-green-500 to-emerald-500" },
  { id: "better_luck", name: "Better Luck!", icon: "🍀", color: "from-gray-400 to-gray-500" },
  { id: "skip_question", name: "Skip Question", icon: "⏭️", color: "from-blue-500 to-cyan-500" },
  { id: "animated_banner", name: "Animated Banner (7d)", icon: "🎨", color: "from-purple-500 to-pink-500" },
  { id: "animated_avatar", name: "Animated Avatar (7d)", icon: "✨", color: "from-violet-500 to-purple-500" },
  { id: "accent_color", name: "Accent Color (7d)", icon: "🌈", color: "from-red-500 to-orange-500" },
  { id: "extra_time", name: "+5 Seconds", icon: "⏱️", color: "from-teal-500 to-cyan-500" },
  { id: "second_chance", name: "Second Chance", icon: "🔄", color: "from-indigo-500 to-blue-500" },
];

interface LuckySpinProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LuckySpin = ({ isOpen, onClose }: LuckySpinProps) => {
  const { profile, updatePoints, refreshProfile } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<typeof REWARDS[0] | null>(null);
  const [rotation, setRotation] = useState(0);
  const spinRef = useRef<number>(0);

  const canSpin = (profile?.points || 0) >= SPIN_COST;

  const spin = async () => {
    if (!profile?.id || isSpinning || !canSpin) return;

    setIsSpinning(true);
    setResult(null);

    // Deduct points first
    await updatePoints(-SPIN_COST, "lucky_spin", "Lucky Spin attempt");

    // Random reward with equal probability
    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    const reward = REWARDS[randomIndex];

    // Calculate rotation (multiple full spins + land on segment)
    const segmentAngle = 360 / REWARDS.length;
    const targetRotation = 360 * 5 + (randomIndex * segmentAngle) + (segmentAngle / 2);
    spinRef.current += targetRotation;
    setRotation(spinRef.current);

    // Wait for spin animation
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Apply reward
    await applyReward(reward);
    setResult(reward);

    // Record spin history
    await supabase.from("lucky_spin_history").insert({
      user_id: profile.id,
      reward_type: reward.id,
      points_spent: SPIN_COST
    });

    setIsSpinning(false);
    await refreshProfile();
  };

  const applyReward = async (reward: typeof REWARDS[0]) => {
    if (!profile?.id) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    switch (reward.id) {
      case "points_2000":
        await updatePoints(2000, "lucky_spin_reward", "Lucky Spin: Won 2000 points!");
        toast.success("🎉 You won 2000 points!");
        break;
      case "points_500":
        await updatePoints(500, "lucky_spin_reward", "Lucky Spin: Won 500 points!");
        toast.success("🎉 You won 500 points!");
        break;
      case "better_luck":
        toast.info("Better luck next time! 🍀");
        break;
      case "skip_question":
        await supabase
          .from("profiles")
          .update({ skip_question_count: (profile as any).skip_question_count + 1 })
          .eq("id", profile.id);
        toast.success("🎉 You won a Skip Question power-up!");
        break;
      case "animated_banner":
        await supabase
          .from("profiles")
          .update({ banner_expires_at: expiresAt.toISOString() })
          .eq("id", profile.id);
        toast.success("🎉 You won Animated Banner for 7 days!");
        break;
      case "animated_avatar":
        await supabase
          .from("profiles")
          .update({ 
            animated_avatar_enabled: true,
            animated_avatar_expires_at: expiresAt.toISOString()
          })
          .eq("id", profile.id);
        toast.success("🎉 You won Animated Avatar for 7 days!");
        break;
      case "accent_color":
        await supabase
          .from("profiles")
          .update({ accent_expires_at: expiresAt.toISOString() })
          .eq("id", profile.id);
        toast.success("🎉 You won Accent Color for 7 days!");
        break;
      case "extra_time":
        await supabase
          .from("profiles")
          .update({ time_extension_count: (profile?.time_extension_count || 0) + 1 })
          .eq("id", profile.id);
        toast.success("🎉 You won +5 Seconds power-up!");
        break;
      case "second_chance":
        await supabase
          .from("profiles")
          .update({ second_chance_count: ((profile as any).second_chance_count || 0) + 1 })
          .eq("id", profile.id);
        toast.success("🎉 You won a Second Chance power-up!");
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Lucky Spin
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* Spin Wheel */}
          <div className="relative w-64 h-64 mb-6">
            {/* Arrow pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
            
            {/* Wheel */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
              className="w-full h-full rounded-full relative overflow-hidden border-4 border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
            >
              {REWARDS.map((reward, index) => {
                const angle = (360 / REWARDS.length) * index;
                const skewAngle = 90 - (360 / REWARDS.length);
                
                return (
                  <div
                    key={reward.id}
                    className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br ${reward.color}`}
                    style={{
                      transform: `rotate(${angle}deg) skewY(-${skewAngle}deg)`,
                      left: 0,
                      top: 0,
                    }}
                  >
                    <span
                      className="absolute text-lg"
                      style={{
                        transform: `skewY(${skewAngle}deg) rotate(${(360 / REWARDS.length) / 2}deg)`,
                        left: "50%",
                        top: "30%",
                      }}
                    >
                      {reward.icon}
                    </span>
                  </div>
                );
              })}
              
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </motion.div>
          </div>

          {/* Result display */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4"
              >
                <GlassCard className={`p-4 bg-gradient-to-br ${result.color} text-white`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{result.icon}</span>
                    <div>
                      <p className="font-bold">You Won!</p>
                      <p className="text-sm opacity-90">{result.name}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin button */}
          <Button
            variant="gradient"
            size="lg"
            onClick={spin}
            disabled={isSpinning || !canSpin}
            className="w-full"
          >
            {isSpinning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Spinning...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Spin for {SPIN_COST} Points
              </>
            )}
          </Button>

          {!canSpin && !isSpinning && (
            <p className="text-sm text-destructive mt-2">
              You need at least {SPIN_COST} points to spin!
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Each reward has an equal chance of being won
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
