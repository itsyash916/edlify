-- Add new profile customization fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS animated_avatar_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS animated_avatar_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS banner_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pomodoro_bg_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pomodoro_bg_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS skip_question_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS second_chance_count INTEGER DEFAULT 0;

-- Add image_url column to questions for picture-based questions
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Create weekly_reports insert policy for the system
CREATE POLICY "System can insert weekly reports"
ON public.weekly_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create weekly_reports update policy
CREATE POLICY "Users can update own reports"
ON public.weekly_reports
FOR UPDATE
USING (auth.uid() = user_id);