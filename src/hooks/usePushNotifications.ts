import { useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Notification sound
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";
const RING_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3";

let notificationAudio: HTMLAudioElement | null = null;
let ringAudio: HTMLAudioElement | null = null;

// Initialize audio elements
if (typeof window !== "undefined") {
  notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
  notificationAudio.volume = 0.5;
  
  ringAudio = new Audio(RING_SOUND_URL);
  ringAudio.volume = 0.6;
}

export const usePushNotifications = () => {
  const { profile } = useAuth();

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationAudio) {
      notificationAudio.currentTime = 0;
      notificationAudio.play().catch(console.error);
    }
  }, []);

  // Play ring sound (for calls/important alerts)
  const playRingSound = useCallback((duration = 3000) => {
    if (ringAudio) {
      ringAudio.currentTime = 0;
      ringAudio.play().catch(console.error);
      
      // Stop after duration
      setTimeout(() => {
        if (ringAudio) {
          ringAudio.pause();
          ringAudio.currentTime = 0;
        }
      }, duration);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Show browser notification
  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    const hasPermission = await requestPermission();
    
    if (hasPermission) {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      playNotificationSound();

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } else {
      // Fallback to toast
      toast.info(title);
      playNotificationSound();
    }
  }, [requestPermission, playNotificationSound]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("user_notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Fetch the notification details
          const { data: notification } = await supabase
            .from("notifications")
            .select("*")
            .eq("id", (payload.new as any).notification_id)
            .single();

          if (notification) {
            showNotification(notification.title, {
              body: notification.message,
              tag: notification.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, showNotification]);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    requestPermission,
    showNotification,
    playNotificationSound,
    playRingSound,
  };
};
