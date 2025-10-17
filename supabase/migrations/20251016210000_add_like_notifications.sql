
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

CREATE TRIGGER on_new_comment_notify_others
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_notification();
