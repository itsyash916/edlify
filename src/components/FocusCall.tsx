import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  UserMinus,
  Shield
} from "lucide-react";

interface CallParticipant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_deafened: boolean;
  joined_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export const FocusCall = () => {
  const { profile, isAdmin } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isRinging, setIsRinging] = useState(false);
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  // Create ring audio
  useEffect(() => {
    ringAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
    ringAudioRef.current.loop = true;
    ringAudioRef.current.volume = 0.5;
    return () => {
      ringAudioRef.current?.pause();
      ringAudioRef.current = null;
    };
  }, []);

  // Subscribe to call participants
  useEffect(() => {
    fetchParticipants();

    const channel = supabase
      .channel("focus_call_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "focus_call_participants" },
        (payload) => {
          console.log("Call participant change:", payload);
          
          // If someone new joined, ring for 3 seconds
          if (payload.eventType === "INSERT" && !isInCall) {
            setIsRinging(true);
            ringAudioRef.current?.play().catch(console.error);
            
            setTimeout(() => {
              setIsRinging(false);
              ringAudioRef.current?.pause();
              if (ringAudioRef.current) {
                ringAudioRef.current.currentTime = 0;
              }
            }, 3000);
          }
          
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInCall]);

  const fetchParticipants = async () => {
    // Fetch participants
    const { data: participantData, error } = await supabase
      .from("focus_call_participants" as any)
      .select("*")
      .order("joined_at", { ascending: true });

    if (error || !participantData) return;

    // Fetch profiles separately
    const userIds = participantData.map((p: any) => p.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    const participantsWithProfiles = participantData.map((p: any) => ({
      ...p,
      profile: profileMap.get(p.user_id),
    }));

    setParticipants(participantsWithProfiles);
    
    // Check if current user is in call
    const userInCall = participantsWithProfiles.some((p: any) => p.user_id === profile?.id);
    setIsInCall(userInCall);
    
    // Update mute/deafen state from DB
    const myParticipation = participantsWithProfiles.find((p: any) => p.user_id === profile?.id);
    if (myParticipation) {
      setIsMuted(myParticipation.is_muted);
      setIsDeafened(myParticipation.is_deafened);
    }
  };

  const joinCall = async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from("focus_call_participants" as any)
      .upsert({
        user_id: profile.id,
        is_muted: false,
        is_deafened: false,
        joined_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("Failed to join call");
      console.error(error);
    } else {
      setIsInCall(true);
      toast.success("Joined focus call! 📞");
    }
  };

  const leaveCall = async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from("focus_call_participants" as any)
      .delete()
      .eq("user_id", profile.id);

    if (error) {
      toast.error("Failed to leave call");
    } else {
      setIsInCall(false);
      setIsMuted(false);
      setIsDeafened(false);
      toast.info("Left focus call");
    }
  };

  const toggleMute = async () => {
    if (!profile?.id) return;

    const newMuteState = !isMuted;
    const { error } = await supabase
      .from("focus_call_participants" as any)
      .update({ is_muted: newMuteState } as any)
      .eq("user_id", profile.id);

    if (!error) {
      setIsMuted(newMuteState);
    }
  };

  const toggleDeafen = async () => {
    if (!profile?.id) return;

    const newDeafenState = !isDeafened;
    const { error } = await supabase
      .from("focus_call_participants" as any)
      .update({ is_deafened: newDeafenState, is_muted: newDeafenState ? true : isMuted } as any)
      .eq("user_id", profile.id);

    if (!error) {
      setIsDeafened(newDeafenState);
      if (newDeafenState) setIsMuted(true);
    }
  };

  // Admin functions
  const kickUser = async (userId: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("focus_call_participants" as any)
      .delete()
      .eq("user_id", userId);

    if (!error) {
      toast.success("User removed from call");
    }
  };

  const muteUser = async (userId: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("focus_call_participants" as any)
      .update({ is_muted: true } as any)
      .eq("user_id", userId);

    if (!error) {
      toast.success("User muted");
    }
  };

  const deafenUser = async (userId: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("focus_call_participants" as any)
      .update({ is_deafened: true, is_muted: true } as any)
      .eq("user_id", userId);

    if (!error) {
      toast.success("User deafened");
    }
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className={`w-5 h-5 ${isInCall ? "text-success" : "text-muted-foreground"}`} />
          <h3 className="font-semibold">Focus Call</h3>
          {participants.length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {participants.length} in call
            </span>
          )}
        </div>
        
        {isRinging && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-xs text-warning font-medium"
          >
            📞 Incoming...
          </motion.span>
        )}
      </div>

      {/* Participants List */}
      {participants.length > 0 && (
        <div className="space-y-2 mb-4">
          {participants.map((participant) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={participant.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {participant.profile?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {participant.profile?.name || "Unknown"}
                    {participant.user_id === profile?.id && " (You)"}
                  </p>
                  <div className="flex items-center gap-1">
                    {participant.is_muted && (
                      <MicOff className="w-3 h-3 text-destructive" />
                    )}
                    {participant.is_deafened && (
                      <VolumeX className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                </div>
              </div>

              {/* Admin controls */}
              {isAdmin && participant.user_id !== profile?.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => muteUser(participant.user_id)}
                    title="Mute user"
                  >
                    <MicOff className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => deafenUser(participant.user_id)}
                    title="Deafen user"
                  >
                    <VolumeX className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => kickUser(participant.user_id)}
                    title="Remove from call"
                  >
                    <UserMinus className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-3">
        {isInCall ? (
          <>
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="sm"
              className="h-10 w-10 rounded-full p-0"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              className="h-12 w-12 rounded-full p-0"
              onClick={leaveCall}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
            
            <Button
              variant={isDeafened ? "destructive" : "outline"}
              size="sm"
              className="h-10 w-10 rounded-full p-0"
              onClick={toggleDeafen}
            >
              {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </>
        ) : (
          <Button
            variant="gradient"
            size="lg"
            onClick={joinCall}
            className="gap-2"
          >
            <Phone className="w-4 h-4" />
            Join Focus Call
          </Button>
        )}
      </div>

      {/* Info */}
      <p className="text-2xs text-muted-foreground text-center mt-3">
        {isInCall 
          ? "You're in the focus call. Study together with others!"
          : "Join to study together with others in real-time"
        }
      </p>

      {isAdmin && isInCall && (
        <div className="flex items-center justify-center gap-1 mt-2 text-2xs text-warning">
          <Shield className="w-3 h-3" />
          <span>Admin: You can moderate participants</span>
        </div>
      )}
    </GlassCard>
  );
};