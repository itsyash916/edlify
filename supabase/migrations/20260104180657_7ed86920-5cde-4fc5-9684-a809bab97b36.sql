-- Add is_important column to questions table
ALTER TABLE public.questions 
ADD COLUMN is_important boolean NOT NULL DEFAULT false;