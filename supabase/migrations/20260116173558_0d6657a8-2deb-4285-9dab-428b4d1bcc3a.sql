-- Create focus call participants table for voice call feature
CREATE TABLE public.focus_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_deafened BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.focus_call_participants ENABLE ROW LEVEL SECURITY;

-- Anyone can see who's in the call
CREATE POLICY "Anyone can view call participants" 
ON public.focus_call_participants 
FOR SELECT 
USING (true);

-- Users can join/update their own participation
CREATE POLICY "Users can join call" 
ON public.focus_call_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" 
ON public.focus_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave call" 
ON public.focus_call_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policy - admins can modify anyone
CREATE POLICY "Admins can manage all participants"
ON public.focus_call_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Enable realtime for call participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_call_participants;