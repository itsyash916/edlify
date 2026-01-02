-- Create quiz_completions table to track completed quizzes per user
CREATE TABLE public.quiz_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  question_results JSONB,
  UNIQUE(user_id, quiz_id)
);

-- Enable RLS
ALTER TABLE public.quiz_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_completions
CREATE POLICY "Users can view own quiz completions"
ON public.quiz_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz completions"
ON public.quiz_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create focus_sessions table to track pomodoro/focus sessions
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'short',
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for focus_sessions
CREATE POLICY "Users can view own focus sessions"
ON public.focus_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own focus sessions"
ON public.focus_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions"
ON public.focus_sessions
FOR DELETE
USING (auth.uid() = user_id);