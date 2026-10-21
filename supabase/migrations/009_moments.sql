-- Momentos: galería de fotos y chat de los invitados durante el evento.
-- Los invitados no tienen sesión: escriben y leen solo a través de
-- /api/pass/[uuid]/moments (service role), por eso no hay políticas anon.

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS moments_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  path TEXT NOT NULL,
  thumb_path TEXT NOT NULL,
  width INT,
  height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_wedding ON event_photos (wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_photos_group ON event_photos (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_wedding ON chat_messages (wedding_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages (group_id, created_at DESC);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Organizadores: ver y moderar lo de su evento
DROP POLICY IF EXISTS "Organizers can view event photos" ON event_photos;
CREATE POLICY "Organizers can view event photos" ON event_photos
  FOR SELECT USING (wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Organizers can delete event photos" ON event_photos;
CREATE POLICY "Organizers can delete event photos" ON event_photos
  FOR DELETE USING (wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Organizers can view chat messages" ON chat_messages;
CREATE POLICY "Organizers can view chat messages" ON chat_messages
  FOR SELECT USING (wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Organizers can delete chat messages" ON chat_messages;
CREATE POLICY "Organizers can delete chat messages" ON chat_messages
  FOR DELETE USING (wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid()));

-- Bucket público de lectura: las rutas llevan UUID aleatorio y el listado
-- solo se entrega vía API. Las subidas usan URLs firmadas del servidor.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-photos', 'event-photos', true, 5242880, ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;
