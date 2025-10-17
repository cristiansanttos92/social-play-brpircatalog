-- Drop the previous update policy
DROP POLICY "Users can update own games" ON public.games;

-- Create a new, slightly less strict update policy that only checks the existing row
CREATE POLICY "Users can update own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = profile_id);
