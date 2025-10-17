-- Drop the old, overly broad policy
DROP POLICY "Users can manage own games" ON public.games;

-- Re-create the policy for INSERT with a specific check
CREATE POLICY "Users can insert own games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Re-create the policy for UPDATE with a specific check
CREATE POLICY "Users can update own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Re-create the policy for DELETE with a specific check
CREATE POLICY "Users can delete own games"
  ON public.games FOR DELETE
  USING (auth.uid() = profile_id);
