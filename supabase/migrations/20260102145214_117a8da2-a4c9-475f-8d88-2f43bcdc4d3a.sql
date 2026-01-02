-- Fix the security definer view issue by using security invoker
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
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
FROM public.profiles;

-- Re-grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;