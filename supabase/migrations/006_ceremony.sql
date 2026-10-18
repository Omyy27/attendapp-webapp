-- Ceremonia (lugar, fecha y hora) y hora de la recepción.
-- `venue_*` sigue siendo el lugar de la recepción (después de la ceremonia).
-- La ceremonia es opcional: se muestra si `ceremony_name` tiene valor.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS ceremony_name TEXT,
  ADD COLUMN IF NOT EXISTS ceremony_address TEXT,
  ADD COLUMN IF NOT EXISTS ceremony_city TEXT,
  ADD COLUMN IF NOT EXISTS ceremony_country TEXT,
  ADD COLUMN IF NOT EXISTS ceremony_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS ceremony_lng DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS ceremony_date DATE,   -- si es NULL se usa la fecha del evento
  ADD COLUMN IF NOT EXISTS ceremony_time TEXT,   -- 'HH:MM' (24 h)
  ADD COLUMN IF NOT EXISTS reception_time TEXT;  -- 'HH:MM' (24 h)
