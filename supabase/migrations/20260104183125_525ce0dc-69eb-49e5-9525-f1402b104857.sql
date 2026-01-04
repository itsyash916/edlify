-- Add RLS policy for admins to delete any doubt
CREATE POLICY "Admins can delete any doubt" 
ON public.doubts 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to delete any doubt answer
CREATE POLICY "Admins can delete any doubt answer" 
ON public.doubt_answers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));