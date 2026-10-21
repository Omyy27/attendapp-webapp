-- "Me gusta" en las fotos de Momentos: uno por invitado y foto.
-- Igual que 009: los invitados escriben solo vía /api/pass/[uuid]/moments.

CREATE TABLE IF NOT EXISTS photo_likes (
  photo_id UUID NOT NULL REFERENCES event_photos(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_likes_wedding ON photo_likes (wedding_id);

ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can view photo likes" ON photo_likes;
CREATE POLICY "Organizers can view photo likes" ON photo_likes
  FOR SELECT USING (wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid()));
