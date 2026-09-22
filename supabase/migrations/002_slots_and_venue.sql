-- Fase A: Cupos por invitado
ALTER TABLE guests ADD COLUMN IF NOT EXISTS slots INT DEFAULT 1;

-- Fase B: Tabla de layout del salón
CREATE TABLE IF NOT EXISTS venue_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  x FLOAT NOT NULL DEFAULT 100,
  y FLOAT NOT NULL DEFAULT 100,
  width FLOAT NOT NULL DEFAULT 120,
  height FLOAT NOT NULL DEFAULT 120,
  rotation FLOAT NOT NULL DEFAULT 0,
  shape TEXT NOT NULL DEFAULT 'circle',
  color TEXT DEFAULT '#c8a054',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wedding_id, table_number)
);

-- RLS para venue_tables
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY " venue_tables_select" ON venue_tables
  FOR SELECT USING (
    wedding_id IN (
      SELECT wedding_id FROM organizers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "venue_tables_insert" ON venue_tables
  FOR INSERT WITH CHECK (
    wedding_id IN (
      SELECT wedding_id FROM organizers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "venue_tables_update" ON venue_tables
  FOR UPDATE USING (
    wedding_id IN (
      SELECT wedding_id FROM organizers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "venue_tables_delete" ON venue_tables
  FOR DELETE USING (
    wedding_id IN (
      SELECT wedding_id FROM organizers WHERE user_id = auth.uid()
    )
  );
