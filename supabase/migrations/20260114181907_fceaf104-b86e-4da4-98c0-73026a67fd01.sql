-- Create chat rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'public', -- 'public', 'subject', 'dm'
  subject TEXT, -- for subject-based rooms
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'system'
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DM participants table (for direct messages)
CREATE TABLE public.dm_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create user online status table
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies
CREATE POLICY "Anyone can view public and subject rooms"
ON public.chat_rooms FOR SELECT
USING (room_type IN ('public', 'subject'));

CREATE POLICY "Users can view their DM rooms"
ON public.chat_rooms FOR SELECT
USING (
  room_type = 'dm' AND EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create DM rooms"
ON public.chat_rooms FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND room_type = 'dm');

-- Chat messages policies
CREATE POLICY "Users can view messages in accessible rooms"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = room_id AND (
      r.room_type IN ('public', 'subject') OR
      (r.room_type = 'dm' AND EXISTS (
        SELECT 1 FROM public.dm_participants
        WHERE room_id = r.id AND user_id = auth.uid()
      ))
    )
  )
);

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- DM participants policies
CREATE POLICY "Users can view their DM participations"
ON public.dm_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can add participants to their DMs"
ON public.dm_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- User presence policies
CREATE POLICY "Anyone can view presence"
ON public.user_presence FOR SELECT
USING (true);

CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence status"
ON public.user_presence FOR UPDATE
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_dm_participants_user_id ON public.dm_participants(user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Insert default chat rooms
INSERT INTO public.chat_rooms (name, room_type, subject) VALUES
('General', 'public', NULL),
('Math Help', 'subject', 'Math'),
('Science Hub', 'subject', 'Science'),
('History Corner', 'subject', 'History'),
('Language Arts', 'subject', 'English');