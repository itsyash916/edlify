-- Fix 1: Create public view without email and restrict profiles access
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create public view without sensitive data (email)
CREATE OR REPLACE VIEW public.profiles_public AS
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

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Allow users to see only their own full profile (includes email)
CREATE POLICY "Users can view own full profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix 2: Add UPDATE and DELETE policies for doubt_answers
CREATE POLICY "Users can update own answers"
ON public.doubt_answers
FOR UPDATE
USING (auth.uid() = user_id);

-- Only allow deletion of unaccepted answers
CREATE POLICY "Users can delete own unaccepted answers"
ON public.doubt_answers
FOR DELETE
USING (auth.uid() = user_id AND is_accepted = false);

-- Fix 3: Create atomic point update function to prevent race conditions
CREATE OR REPLACE FUNCTION public.update_points_atomic(
  _user_id UUID,
  _amount INTEGER,
  _transaction_type TEXT,
  _description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points INTEGER;
BEGIN
  -- Atomically update points and return new value
  UPDATE public.profiles 
  SET points = GREATEST(0, points + _amount)
  WHERE id = _user_id
  RETURNING points INTO new_points;
  
  -- Record the transaction
  INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
  VALUES (_user_id, _amount, _transaction_type, _description);
  
  RETURN new_points;
END;
$$;

-- Create atomic study minutes update function
CREATE OR REPLACE FUNCTION public.update_study_minutes_atomic(
  _user_id UUID,
  _minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE public.profiles 
  SET total_study_minutes = total_study_minutes + _minutes
  WHERE id = _user_id
  RETURNING total_study_minutes INTO new_total;
  
  RETURN new_total;
END;
$$;

-- Create atomic power-up consumption function
CREATE OR REPLACE FUNCTION public.use_powerup_atomic(
  _user_id UUID,
  _powerup_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  success BOOLEAN := false;
BEGIN
  IF _powerup_type = 'time_extension' THEN
    UPDATE public.profiles 
    SET time_extension_count = time_extension_count - 1
    WHERE id = _user_id AND time_extension_count > 0
    RETURNING true INTO success;
  ELSIF _powerup_type = 'skip_question' THEN
    UPDATE public.profiles 
    SET skip_question_count = skip_question_count - 1
    WHERE id = _user_id AND skip_question_count > 0
    RETURNING true INTO success;
  ELSIF _powerup_type = 'second_chance' THEN
    UPDATE public.profiles 
    SET second_chance_count = second_chance_count - 1
    WHERE id = _user_id AND second_chance_count > 0
    RETURNING true INTO success;
  END IF;
  
  RETURN COALESCE(success, false);
END;
$$;

-- Create atomic doubts answered update
CREATE OR REPLACE FUNCTION public.increment_doubts_answered_atomic(
  _user_id UUID,
  _bounty INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE public.profiles 
  SET 
    points = points + _bounty,
    doubts_answered = doubts_answered + 1
  WHERE id = _user_id
  RETURNING points INTO new_points;
  
  RETURN new_points;
END;
$$;

-- Create atomic quizzes completed update
CREATE OR REPLACE FUNCTION public.increment_quizzes_completed_atomic(
  _user_id UUID,
  _points_earned INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE public.profiles 
  SET 
    points = points + _points_earned,
    quizzes_completed = quizzes_completed + 1
  WHERE id = _user_id
  RETURNING points INTO new_points;
  
  RETURN new_points;
END;
$$;