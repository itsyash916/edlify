import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import { StreakBadge, PointsBadge } from "@/components/ui/badges";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Zap } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ProfilePopoverProps {
  userId: string;
  children: React.ReactNode;
}

interface ProfileData {
  id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  streak: number;
  bio?: string;
  status?: string;
  banner_url?: string;
  accent_color?: string;
  animated_avatar_enabled?: boolean;
}

export const ProfilePopover = ({ userId, children }: ProfilePopoverProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (profile) return;
    setLoading(true);
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data as ProfileData);
    }
    setLoading(false);
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild onMouseEnter={fetchProfile}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-0 glass-card border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : profile ? (
          <>
            {/* Banner */}
            <div 
              className="h-16 bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent"
              style={profile.banner_url ? {
                backgroundImage: `url(${profile.banner_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : undefined}
            />
            
            <div className="p-4 pt-0 -mt-8">
              {/* Avatar */}
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg overflow-hidden border-4 border-background relative"
                style={profile.accent_color ? {
                  background: `linear-gradient(135deg, hsl(${profile.accent_color}), hsl(262 83% 58%))`
                } : undefined}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.name?.charAt(0) || "?"
                )}
                {profile.animated_avatar_enabled && (
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2"
                  >
                    <Crown className="w-4 h-4 text-warning drop-shadow-[0_0_5px_hsl(45_93%_58%)]" />
                  </motion.div>
                )}
              </motion.div>
              
              {/* Info */}
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold">{profile.name}</h4>
                  {profile.status && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-2xs text-muted-foreground">
                      {profile.status}
                    </span>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
                )}
                
                <div className="flex items-center gap-3 mt-3">
                  <PointsBadge points={profile.points} size="sm" />
                  <StreakBadge count={profile.streak} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Profile not found
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
