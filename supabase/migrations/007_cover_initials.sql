-- Sobre y previa de la invitación con solo las iniciales de los novios (p. ej. "D & M").
-- Dentro de la invitación (video, carta abierta) los nombres siguen completos.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS cover_initials BOOLEAN NOT NULL DEFAULT false;
