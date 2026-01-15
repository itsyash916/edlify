import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flame, Clock } from "lucide-react";

interface FocusingUser {
  id: string;
  user_id: string;
  session_name: string;
  started_at: string;
  mode: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export const FocusTogether = () => {
  const { profile } = useAuth();
  const [focusingUsers, setFocusingUsers] = useState<FocusingUser[]>([]);

  useEffect(() => {
    fetchFocusingUsers();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel("active_focus_sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_focus_sessions",
        },
        () => {
          fetchFocusingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFocusingUsers = async () => {
    const { data: sessions } = await supabase
      .from("active_focus_sessions")
      .select("*")
      .order("started_at", { ascending: false });

    if (!sessions) {
      setFocusingUsers([]);
      return;
    }

    // Fetch profiles for each user
    const userIds = sessions.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const usersWithProfiles = sessions.map((session) => ({
      ...session,
      profile: profiles?.find((p) => p.id === session.user_id),
    }));

    setFocusingUsers(usersWithProfiles);
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just started";
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const otherUsers = focusingUsers.filter((u) => u.user_id !== profile?.id);

  if (otherUsers.length === 0) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Focus Together</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          No one else is focusing right now. Start a session to inspire others!
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Focus Together</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {otherUsers.length} focusing
        </span>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        <AnimatePresence>
          {otherUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
            >
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-primary/20">
                    {user.profile?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                {/* Pulsing indicator */}
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.profile?.name || "Anonymous"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="w-3 h-3 text-warning" />
                  <span>{user.mode}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(user.started_at)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
};
