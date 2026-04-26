ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_ratings BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_favorites BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_catalog_comments BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_catalog_copy BOOLEAN NOT NULL DEFAULT true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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

CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
