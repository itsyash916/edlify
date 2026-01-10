-- Create notifications table for system-wide and user-specific notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', -- general, review, reward
    target_type TEXT NOT NULL DEFAULT 'all', -- all, specific
    target_user_ids UUID[] DEFAULT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_notifications for tracking read status per user
CREATE TABLE public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, notification_id)
);

-- Create lucky_spin_history table for tracking spins
CREATE TABLE public.lucky_spin_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL, -- points_2000, points_500, better_luck, skip_question, animated_banner, animated_avatar, accent_color, extra_time, second_chance
    reward_value TEXT,
    points_spent INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_spin_history ENABLE ROW LEVEL SECURITY;

-- Notifications policies (all authenticated users can read public notifications)
CREATE POLICY "Anyone can view notifications meant for everyone" 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (target_type = 'all' OR auth.uid() = ANY(target_user_ids));

CREATE POLICY "Admins can create notifications"
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
ON public.notifications 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notifications"
ON public.notifications 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User notifications policies
CREATE POLICY "Users can view their own notification status"
ON public.user_notifications 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification status"
ON public.user_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification status"
ON public.user_notifications 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Lucky spin history policies
CREATE POLICY "Users can view their own spin history"
ON public.lucky_spin_history 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spin history"
ON public.lucky_spin_history 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;