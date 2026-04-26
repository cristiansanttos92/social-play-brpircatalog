ALTER TABLE public.games
  ADD COLUMN summary TEXT,
  ADD COLUMN storyline TEXT,
  ADD COLUMN igdb_url TEXT,
  ADD COLUMN aggregated_rating NUMERIC,
  ADD COLUMN first_release_date INTEGER,
  ADD COLUMN total_rating NUMERIC,
  ADD COLUMN total_rating_count INTEGER,
  ADD COLUMN rating_count INTEGER,
  ADD COLUMN game_modes JSONB,
  ADD COLUMN player_perspectives JSONB,
  ADD COLUMN themes JSONB,
  ADD COLUMN involved_companies JSONB;
