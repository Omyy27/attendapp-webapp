-- Sección de obsequios de la invitación (p. ej. lluvia de sobres).
-- NULL = la sección no se muestra.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS gift_message TEXT;
