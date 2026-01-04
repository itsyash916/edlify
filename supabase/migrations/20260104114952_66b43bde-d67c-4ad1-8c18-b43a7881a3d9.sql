-- Add scheduling and banner columns to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Update the RLS policy to only show quizzes that are active AND (not scheduled OR scheduled_at has passed)
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON public.quizzes;

CREATE POLICY "Anyone can view active quizzes" 
ON public.quizzes 
FOR SELECT 
USING (
  is_active = true 
  AND (
    scheduled_at IS NULL 
    OR scheduled_at <= NOW()
  )
);