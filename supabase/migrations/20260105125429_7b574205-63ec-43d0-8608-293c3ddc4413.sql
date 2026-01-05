-- Add quiz-level time settings
ALTER TABLE public.quizzes 
ADD COLUMN time_per_question integer NOT NULL DEFAULT 15,
ADD COLUMN hint_delay integer NOT NULL DEFAULT 5;

-- Add question type to questions table
ALTER TABLE public.questions
ADD COLUMN question_type text NOT NULL DEFAULT 'mcq';

-- Create table for long answer submissions
CREATE TABLE public.long_answer_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer_text TEXT NOT NULL,
  is_reviewed BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.long_answer_submissions ENABLE ROW LEVEL SECURITY;

-- Users can create their own submissions
CREATE POLICY "Users can create own submissions"
ON public.long_answer_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON public.long_answer_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON public.long_answer_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update submissions (for review)
CREATE POLICY "Admins can update submissions"
ON public.long_answer_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_long_answer_submissions_quiz_id ON public.long_answer_submissions(quiz_id);
CREATE INDEX idx_long_answer_submissions_user_id ON public.long_answer_submissions(user_id);
CREATE INDEX idx_long_answer_submissions_is_reviewed ON public.long_answer_submissions(is_reviewed);