-- Estado `opened`: el invitado abrió la carta (sin confirmar todavía).
-- Ciclo: pending -> opened -> confirmed -> checked_in
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_status_check;
ALTER TABLE guests ADD CONSTRAINT guests_status_check
  CHECK (status IN ('pending', 'opened', 'confirmed', 'checked_in'));

-- Primera vez que se abrió la carta
ALTER TABLE guests ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
