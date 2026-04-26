-- Database recreation script for fresh setup
-- Run on a clean Supabase database or PostgreSQL database with auth/storage schemas already available.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
SET search_path = public, auth, storage;

-- Unified SQL script generated from supabase/migrations
-- Run in order to apply the same schema changes as the individual migration files.

-- BEGIN 20251011213117_cffa40ab-8926-4af8-853e-5fc875a1469e.sql
-- Create profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create games table for user catalogs
DROP TABLE IF EXISTS public.games CASCADE;
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'playing', 'completed', 'dropped')),
  rating INTEGER CHECK (rating >= 0 AND rating <= 10),
  genre TEXT,
  hours_played INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Games policies
DROP POLICY IF EXISTS "Games are viewable by everyone" ON public.games;
CREATE POLICY "Games are viewable by everyone"
  ON public.games FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own games" ON public.games;
CREATE POLICY "Users can manage own games"
  ON public.games FOR ALL
  USING (auth.uid() = profile_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_games ON public.games;
CREATE TRIGGER set_updated_at_games
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- END 20251011213117_cffa40ab-8926-4af8-853e-5fc875a1469e.sql

-- BEGIN 20251012120000_add_comments_table.sql
DROP TABLE IF EXISTS public.comments CASCADE;
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.comments;
CREATE POLICY "Allow authenticated users to insert comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow users to view all comments" ON public.comments;
CREATE POLICY "Allow users to view all comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow users to delete their own comments" ON public.comments;
CREATE POLICY "Allow users to delete their own comments"
ON public.comments
FOR DELETE
TO authenticated
USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow users to update their own comments" ON public.comments;
CREATE POLICY "Allow users to update their own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- END 20251012120000_add_comments_table.sql

-- BEGIN 20251016120000_add_is_favorite_to_games.sql
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- END 20251016120000_add_is_favorite_to_games.sql

-- BEGIN 20251016130000_add_favorite_position_to_games.sql
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS favorite_position INTEGER;

-- END 20251016130000_add_favorite_position_to_games.sql

-- BEGIN 20251016140000_fix_game_rls_policies.sql
-- Drop the old, overly broad policy
DROP POLICY IF EXISTS "Users can manage own games" ON public.games;

-- Re-create the policy for INSERT with a specific check
DROP POLICY IF EXISTS "Users can insert own games" ON public.games;
CREATE POLICY "Users can insert own games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Re-create the policy for UPDATE with a specific check
DROP POLICY IF EXISTS "Users can update own games" ON public.games;
CREATE POLICY "Users can update own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Re-create the policy for DELETE with a specific check
DROP POLICY IF EXISTS "Users can delete own games" ON public.games;
CREATE POLICY "Users can delete own games"
  ON public.games FOR DELETE
  USING (auth.uid() = profile_id);

-- END 20251016140000_fix_game_rls_policies.sql

-- BEGIN 20251016150000_relax_game_update_policy.sql
-- Drop the previous update policy
DROP POLICY IF EXISTS "Users can update own games" ON public.games;

-- Create a new, slightly less strict update policy that only checks the existing row
DROP POLICY IF EXISTS "Users can update own games" ON public.games;
CREATE POLICY "Users can update own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = profile_id);

-- END 20251016150000_relax_game_update_policy.sql

-- BEGIN 20251016180000_add_activities_table.sql

-- Create activities table
DROP TABLE IF EXISTS public.activities CASCADE;
CREATE TABLE public.activities (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies for activities
DROP POLICY IF EXISTS "Activities are viewable by authenticated users" ON public.activities;
CREATE POLICY "Activities are viewable by authenticated users"
  ON public.activities FOR SELECT
  USING (auth.role() = 'authenticated');

-- Function to create an activity log
CREATE OR REPLACE FUNCTION public.log_activity(p_profile_id UUID, p_type TEXT, p_metadata JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activities (profile_id, type, metadata)
  VALUES (p_profile_id, p_type, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log game status changes
CREATE OR REPLACE FUNCTION public.handle_game_update_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log activity only if status or rating has changed
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.rating IS DISTINCT FROM NEW.rating THEN
    PERFORM public.log_activity(
      NEW.profile_id,
      'game.update',
      jsonb_build_object(
        'game_id', NEW.id,
        'game_title', NEW.title,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_rating', OLD.rating,
        'new_rating', NEW.rating
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_updated ON public.games;
CREATE TRIGGER on_game_updated
  AFTER UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_update_activity();

-- Trigger to log new game additions
CREATE OR REPLACE FUNCTION public.handle_game_insert_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_activity(
    NEW.profile_id,
    'game.new',
    jsonb_build_object(
      'game_id', NEW.id,
      'game_title', NEW.title,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_inserted ON public.games;
CREATE TRIGGER on_game_inserted
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_insert_activity();

-- Trigger to log new comments
CREATE OR REPLACE FUNCTION public.handle_comment_insert_activity()
RETURNS TRIGGER AS $$
DECLARE
  game_title_text TEXT;
BEGIN
  -- Get the game title
  SELECT title INTO game_title_text FROM public.games WHERE id = NEW.game_id;

  PERFORM public.log_activity(
    NEW.profile_id,
    'comment.new',
    jsonb_build_object(
      'game_id', NEW.game_id,
      'game_title', game_title_text,
      'comment_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;
CREATE TRIGGER on_comment_inserted
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_insert_activity();

-- END 20251016180000_add_activities_table.sql

-- BEGIN 20251016190000_add_notifications.sql

-- Create notifications table
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- The user who receives the notification
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- The user who triggered the notification
  type TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id UUID, p_actor_id UUID, p_type TEXT, p_metadata JSONB)
RETURNS VOID AS $$
BEGIN
  -- Do not notify the user about their own actions
  IF p_user_id != p_actor_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (p_user_id, p_actor_id, p_type, p_metadata);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify users about comments on the same game
CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  commenter_profile_id UUID := NEW.profile_id;
  game_id_of_comment UUID := NEW.game_id;
  game_title_text TEXT;
  other_commenter RECORD;
BEGIN
  -- Get the game title
  SELECT title INTO game_title_text FROM public.games WHERE id = game_id_of_comment;

  -- Find other users who have commented on the same game
  FOR other_commenter IN 
    SELECT DISTINCT profile_id FROM public.comments
    WHERE game_id = game_id_of_comment AND profile_id != commenter_profile_id
  LOOP
    PERFORM public.create_notification(
      other_commenter.profile_id, -- The user to notify
      commenter_profile_id,       -- The user who acted
      'comment.reply',            -- The type of notification
      jsonb_build_object(         -- The metadata
        'game_id', game_id_of_comment,
        'game_title', game_title_text,
        'comment_id', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_comment_notify_others ON public.comments;
CREATE TRIGGER on_new_comment_notify_others
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_notification();

-- END 20251016190000_add_notifications.sql

-- BEGIN 20251016200000_add_likes_table.sql

-- Create likes table
DROP TABLE IF EXISTS public.likes CASCADE;
CREATE TABLE public.likes (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, game_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Policies for likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
CREATE POLICY "Users can view all likes"
  ON public.likes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;
CREATE POLICY "Users can manage their own likes"
  ON public.likes FOR ALL
  USING (auth.uid() = user_id);

-- END 20251016200000_add_likes_table.sql

-- BEGIN 20251016210000_add_like_notifications.sql

-- Function to handle new like notifications
CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  game_owner_id UUID;
  game_title_text TEXT;
BEGIN
  -- Find the owner of the game that was liked
  SELECT profile_id, title INTO game_owner_id, game_title_text FROM public.games WHERE id = NEW.game_id;

  -- Create a notification for the game owner
  PERFORM public.create_notification(
    game_owner_id,          -- The user to notify (game owner)
    NEW.user_id,            -- The user who acted (who liked the game)
    'game.like',              -- The type of notification
    jsonb_build_object(     -- The metadata
      'game_id', NEW.game_id,
      'game_title', game_title_text,
      'liker_id', NEW.user_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire after a new like is inserted
DROP TRIGGER IF EXISTS on_like_inserted ON public.likes;
CREATE TRIGGER on_like_inserted
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_like_notification();

-- Also, let's refine the comment notification trigger to be sure it works.
-- We will drop the old one and create a slightly modified version.
DROP TRIGGER IF EXISTS on_new_comment_notify_others ON public.comments;
DROP FUNCTION IF EXISTS public.handle_new_comment_notification();

CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  commenter_profile_id UUID := NEW.profile_id;
  game_id_of_comment UUID := NEW.game_id;
  game_title_text TEXT;
  other_commenter RECORD;
BEGIN
  SELECT title INTO game_title_text FROM public.games WHERE id = game_id_of_comment;

  FOR other_commenter IN 
    SELECT DISTINCT profile_id FROM public.comments
    WHERE game_id = game_id_of_comment AND profile_id != commenter_profile_id
  LOOP
    -- Create a notification for each other user who commented on the same game
    PERFORM public.create_notification(
      other_commenter.profile_id, -- The user to notify
      commenter_profile_id,       -- The user who acted
      'comment.reply',            -- The type of notification
      jsonb_build_object(         -- The metadata
        'game_id', game_id_of_comment,
        'game_title', game_title_text,
        'comment_id', NEW.id,
        'commenter_id', commenter_profile_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_comment_notify_others ON public.comments;
CREATE TRIGGER on_new_comment_notify_others
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_notification();

-- END 20251016210000_add_like_notifications.sql

-- BEGIN 20260419120000_add_igdb_metadata_to_games.sql
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS storyline TEXT,
  ADD COLUMN IF NOT EXISTS igdb_url TEXT,
  ADD COLUMN IF NOT EXISTS aggregated_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS first_release_date INTEGER,
  ADD COLUMN IF NOT EXISTS total_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS total_rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS game_modes JSONB,
  ADD COLUMN IF NOT EXISTS player_perspectives JSONB,
  ADD COLUMN IF NOT EXISTS themes JSONB,
  ADD COLUMN IF NOT EXISTS involved_companies JSONB;

-- END 20260419120000_add_igdb_metadata_to_games.sql

-- BEGIN 20260421173000_add_igdb_id_to_games.sql
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS igdb_id INTEGER;

-- END 20260421173000_add_igdb_id_to_games.sql

-- BEGIN 20260421182000_add_pt_translations_to_games.sql
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS summary_pt TEXT,
  ADD COLUMN IF NOT EXISTS storyline_pt TEXT;

-- END 20260421182000_add_pt_translations_to_games.sql

-- BEGIN 20260425103000_add_profile_visibility_and_avatar_storage.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_ratings BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_favorites BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_catalog_comments BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_catalog_copy BOOLEAN NOT NULL DEFAULT true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- END 20260425103000_add_profile_visibility_and_avatar_storage.sql

