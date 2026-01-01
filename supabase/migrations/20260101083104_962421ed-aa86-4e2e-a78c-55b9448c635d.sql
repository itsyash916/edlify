-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 100,
  streak INTEGER NOT NULL DEFAULT 0,
  total_study_minutes INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  doubts_answered INTEGER NOT NULL DEFAULT 0,
  time_extension_count INTEGER NOT NULL DEFAULT 0,
  accent_color TEXT,
  accent_expires_at TIMESTAMPTZ,
  profile_frame TEXT,
  profile_banner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  badge_order INTEGER NOT NULL
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  hint TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create doubts table
CREATE TABLE public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  image_url TEXT,
  bounty INTEGER NOT NULL DEFAULT 100,
  subject TEXT NOT NULL,
  solved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create doubt_answers table
CREATE TABLE public.doubt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create question_reports table
CREATE TABLE public.question_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  issue TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create point_transactions table
CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create weekly_reports table
CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_study_minutes INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    100
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for goals
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for todos
CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own todos" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for badges
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quizzes
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage quizzes" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for doubts
CREATE POLICY "Anyone can view doubts" ON public.doubts FOR SELECT USING (true);
CREATE POLICY "Users can create doubts" ON public.doubts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own doubts" ON public.doubts FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for doubt_answers
CREATE POLICY "Anyone can view doubt answers" ON public.doubt_answers FOR SELECT USING (true);
CREATE POLICY "Users can create answers" ON public.doubt_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for question_reports
CREATE POLICY "Users can view own reports" ON public.question_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reports" ON public.question_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all reports" ON public.question_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for point_transactions
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create transactions" ON public.point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weekly_reports
CREATE POLICY "Users can view own reports" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);

-- Insert 100 badges based on points
INSERT INTO public.badges (name, description, icon, points_required, rarity, badge_order) VALUES
  ('Newcomer', 'Welcome to EDLIFY!', '🌱', 0, 'common', 1),
  ('First Steps', 'Earned your first 100 points', '👣', 100, 'common', 2),
  ('Rising Star', 'Reached 200 points', '⭐', 200, 'common', 3),
  ('Quick Learner', 'Reached 300 points', '📚', 300, 'common', 4),
  ('Go-Getter', 'Reached 400 points', '🎯', 400, 'common', 5),
  ('Dedicated', 'Reached 500 points', '💪', 500, 'common', 6),
  ('Scholar', 'Reached 600 points', '🎓', 600, 'common', 7),
  ('Achiever', 'Reached 700 points', '🏅', 700, 'common', 8),
  ('Persistent', 'Reached 800 points', '⚡', 800, 'common', 9),
  ('Determined', 'Reached 900 points', '🔥', 900, 'common', 10),
  ('Thousand Club', 'Reached 1,000 points', '🎉', 1000, 'common', 11),
  ('Bronze I', 'Reached 1,500 points', '🥉', 1500, 'common', 12),
  ('Bronze II', 'Reached 2,000 points', '🥉', 2000, 'common', 13),
  ('Bronze III', 'Reached 2,500 points', '🥉', 2500, 'common', 14),
  ('Silver I', 'Reached 3,000 points', '🥈', 3000, 'rare', 15),
  ('Silver II', 'Reached 3,500 points', '🥈', 3500, 'rare', 16),
  ('Silver III', 'Reached 4,000 points', '🥈', 4000, 'rare', 17),
  ('Gold I', 'Reached 4,500 points', '🥇', 4500, 'rare', 18),
  ('Gold II', 'Reached 5,000 points', '🥇', 5000, 'rare', 19),
  ('Gold III', 'Reached 5,500 points', '🥇', 5500, 'rare', 20),
  ('Platinum I', 'Reached 6,000 points', '💎', 6000, 'rare', 21),
  ('Platinum II', 'Reached 6,500 points', '💎', 6500, 'rare', 22),
  ('Platinum III', 'Reached 7,000 points', '💎', 7000, 'rare', 23),
  ('Diamond I', 'Reached 7,500 points', '💠', 7500, 'epic', 24),
  ('Diamond II', 'Reached 8,000 points', '💠', 8000, 'epic', 25),
  ('Diamond III', 'Reached 8,500 points', '💠', 8500, 'epic', 26),
  ('Master I', 'Reached 9,000 points', '👑', 9000, 'epic', 27),
  ('Master II', 'Reached 9,500 points', '👑', 9500, 'epic', 28),
  ('Master III', 'Reached 10,000 points', '👑', 10000, 'epic', 29),
  ('Elite I', 'Reached 11,000 points', '🌟', 11000, 'epic', 30),
  ('Elite II', 'Reached 12,000 points', '🌟', 12000, 'epic', 31),
  ('Elite III', 'Reached 13,000 points', '🌟', 13000, 'epic', 32),
  ('Champion I', 'Reached 14,000 points', '🏆', 14000, 'epic', 33),
  ('Champion II', 'Reached 15,000 points', '🏆', 15000, 'epic', 34),
  ('Champion III', 'Reached 16,000 points', '🏆', 16000, 'epic', 35),
  ('Legend I', 'Reached 17,000 points', '🔮', 17000, 'legendary', 36),
  ('Legend II', 'Reached 18,000 points', '🔮', 18000, 'legendary', 37),
  ('Legend III', 'Reached 19,000 points', '🔮', 19000, 'legendary', 38),
  ('Grandmaster I', 'Reached 20,000 points', '🎖️', 20000, 'legendary', 39),
  ('Grandmaster II', 'Reached 22,000 points', '🎖️', 22000, 'legendary', 40),
  ('Grandmaster III', 'Reached 24,000 points', '🎖️', 24000, 'legendary', 41),
  ('Titan I', 'Reached 26,000 points', '⚔️', 26000, 'legendary', 42),
  ('Titan II', 'Reached 28,000 points', '⚔️', 28000, 'legendary', 43),
  ('Titan III', 'Reached 30,000 points', '⚔️', 30000, 'legendary', 44),
  ('Immortal I', 'Reached 32,000 points', '🌙', 32000, 'legendary', 45),
  ('Immortal II', 'Reached 34,000 points', '🌙', 34000, 'legendary', 46),
  ('Immortal III', 'Reached 36,000 points', '🌙', 36000, 'legendary', 47),
  ('Divine I', 'Reached 38,000 points', '✨', 38000, 'legendary', 48),
  ('Divine II', 'Reached 40,000 points', '✨', 40000, 'legendary', 49),
  ('Divine III', 'Reached 42,000 points', '✨', 42000, 'legendary', 50),
  ('Celestial I', 'Reached 44,000 points', '🌌', 44000, 'legendary', 51),
  ('Celestial II', 'Reached 46,000 points', '🌌', 46000, 'legendary', 52),
  ('Celestial III', 'Reached 48,000 points', '🌌', 48000, 'legendary', 53),
  ('Ethereal I', 'Reached 50,000 points', '🌈', 50000, 'legendary', 54),
  ('Ethereal II', 'Reached 52,000 points', '🌈', 52000, 'legendary', 55),
  ('Ethereal III', 'Reached 54,000 points', '🌈', 54000, 'legendary', 56),
  ('Mythic I', 'Reached 56,000 points', '🐉', 56000, 'legendary', 57),
  ('Mythic II', 'Reached 58,000 points', '🐉', 58000, 'legendary', 58),
  ('Mythic III', 'Reached 60,000 points', '🐉', 60000, 'legendary', 59),
  ('Ascendant I', 'Reached 62,000 points', '🦅', 62000, 'legendary', 60),
  ('Ascendant II', 'Reached 64,000 points', '🦅', 64000, 'legendary', 61),
  ('Ascendant III', 'Reached 66,000 points', '🦅', 66000, 'legendary', 62),
  ('Apex I', 'Reached 68,000 points', '🦁', 68000, 'legendary', 63),
  ('Apex II', 'Reached 70,000 points', '🦁', 70000, 'legendary', 64),
  ('Apex III', 'Reached 72,000 points', '🦁', 72000, 'legendary', 65),
  ('Zenith I', 'Reached 74,000 points', '🌠', 74000, 'legendary', 66),
  ('Zenith II', 'Reached 76,000 points', '🌠', 76000, 'legendary', 67),
  ('Zenith III', 'Reached 78,000 points', '🌠', 78000, 'legendary', 68),
  ('Omega I', 'Reached 80,000 points', '🔱', 80000, 'legendary', 69),
  ('Omega II', 'Reached 82,000 points', '🔱', 82000, 'legendary', 70),
  ('Omega III', 'Reached 84,000 points', '🔱', 84000, 'legendary', 71),
  ('Supreme I', 'Reached 86,000 points', '⚡', 86000, 'legendary', 72),
  ('Supreme II', 'Reached 88,000 points', '⚡', 88000, 'legendary', 73),
  ('Supreme III', 'Reached 90,000 points', '⚡', 90000, 'legendary', 74),
  ('Ultimate I', 'Reached 92,000 points', '🌋', 92000, 'legendary', 75),
  ('Ultimate II', 'Reached 94,000 points', '🌋', 94000, 'legendary', 76),
  ('Ultimate III', 'Reached 96,000 points', '🌋', 96000, 'legendary', 77),
  ('Transcendent I', 'Reached 97,000 points', '🌞', 97000, 'legendary', 78),
  ('Transcendent II', 'Reached 98,000 points', '🌞', 98000, 'legendary', 79),
  ('Transcendent III', 'Reached 99,000 points', '🌞', 99000, 'legendary', 80),
  ('Speed Demon', 'Answer 10 questions under 3 seconds', '⚡', 0, 'epic', 81),
  ('Consistent Learner', '7-day streak', '📚', 0, 'rare', 82),
  ('Early Bird', 'Study before 6 AM', '🌅', 0, 'common', 83),
  ('Night Owl', 'Study after 11 PM', '🦉', 0, 'common', 84),
  ('Doubt Slayer', 'Help 50 people with doubts', '🗡️', 0, 'legendary', 85),
  ('Quiz Master', 'Complete 100 quizzes', '🏆', 0, 'epic', 86),
  ('Streak Champion', '30-day streak', '🔥', 0, 'legendary', 87),
  ('Pomodoro Pro', '100 hours of focus time', '⏰', 0, 'epic', 88),
  ('Helper Hero', 'Get 10 answers accepted', '🦸', 0, 'rare', 89),
  ('Perfectionist', '100% accuracy in a quiz', '💯', 0, 'epic', 90),
  ('Marathoner', '10 quizzes in one day', '🏃', 0, 'rare', 91),
  ('Subject Master', '90% accuracy in one subject', '🎯', 0, 'epic', 92),
  ('Social Butterfly', 'Post 10 doubts', '🦋', 0, 'common', 93),
  ('Quick Thinker', 'Average response time under 5 seconds', '💨', 0, 'rare', 94),
  ('Bounty Hunter', 'Earn 5000 points from helping', '💰', 0, 'legendary', 95),
  ('Weekend Warrior', 'Study 4+ hours on weekend', '⚔️', 0, 'rare', 96),
  ('Focus Master', '5 hours continuous focus', '🧘', 0, 'epic', 97),
  ('EDLIFY Pioneer', 'One of the first 100 users', '🚀', 0, 'legendary', 98),
  ('Daily Devotee', '365-day streak', '📅', 0, 'legendary', 99),
  ('EDLIFY Legend', 'Reached 100,000 points - The Ultimate Achievement!', '👑', 100000, 'legendary', 100);