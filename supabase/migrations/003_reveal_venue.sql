-- Lugar sorpresa: se revela solo a quien confirma la asistencia.
-- `venue_*` sigue siendo el lugar público (invitación y correo); estos campos
-- solo los entrega el servidor (/api/pass) cuando el grupo ya confirmó.
-- `reveal_venue_name` con valor = función activa.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS reveal_venue_name TEXT,
  ADD COLUMN IF NOT EXISTS reveal_venue_address TEXT,
  ADD COLUMN IF NOT EXISTS reveal_venue_city TEXT,
  ADD COLUMN IF NOT EXISTS reveal_venue_country TEXT,
  ADD COLUMN IF NOT EXISTS reveal_venue_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS reveal_venue_lng DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS reveal_message TEXT;
