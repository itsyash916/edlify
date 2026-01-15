-- Create table for active focus sessions (who's focusing right now)
CREATE TABLE public.active_focus_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    session_name text NOT NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    mode text NOT NULL DEFAULT 'short'
);

-- Enable RLS
ALTER TABLE public.active_focus_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can see who's focusing
CREATE POLICY "Anyone can view active focus sessions"
ON public.active_focus_sessions
FOR SELECT
USING (true);

-- Users can manage their own focus session
CREATE POLICY "Users can insert own focus session"
ON public.active_focus_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus session"
ON public.active_focus_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus session"
ON public.active_focus_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for active focus sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_focus_sessions;

-- Add FCM token column to profiles for push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;

-- Add gradient theme column to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gradient_theme jsonb DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gradient_theme_expires_at timestamp with time zone DEFAULT null;