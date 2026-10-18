-- Modo de confirmación de asistencia:
--   'in_app'    : el invitado confirma con el botón de la invitación (comportamiento original)
--   'organizer' : el invitado confirma con quien le envió la invitación y el organizador
--                 lo marca como confirmado en el panel
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS confirmation_mode TEXT NOT NULL DEFAULT 'in_app'
  CHECK (confirmation_mode IN ('in_app', 'organizer'));
