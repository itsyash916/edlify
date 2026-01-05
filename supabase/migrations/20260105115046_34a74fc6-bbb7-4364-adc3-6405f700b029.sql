-- Drop existing view and recreate with SECURITY INVOKER = FALSE
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = false)
AS
SELECT 
    id,
    name,
    avatar_url,
    points,
    streak,
    total_study_minutes,
    quizzes_completed,
    doubts_answered,
    bio,
    status,
    profile_frame,
    profile_banner,
    banner_url,
    banner_type,
    accent_color,
    accent_expires_at,
    animated_avatar_enabled,
    animated_avatar_expires_at,
    banner_expires_at,
    pomodoro_bg_url,
    pomodoro_bg_expires_at,
    time_extension_count,
    skip_question_count,
    second_chance_count,
    created_at
FROM profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Add RLS policy for admins to update any user's profile (for point adjustments)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));