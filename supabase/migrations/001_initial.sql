-- AttendApp Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Weddings table
CREATE TABLE weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  couple_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  venue_lat DECIMAL(10, 7),
  venue_lng DECIMAL(10, 7),
  dress_code TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organizers table
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  wedding_id UUID REFERENCES weddings(id),
  role TEXT DEFAULT 'organizer' CHECK (role IN ('organizer', 'scanner')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guest groups (families)
CREATE TABLE guest_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) NOT NULL,
  name TEXT NOT NULL,
  table_number INT,
  pass_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  pass_sent BOOLEAN DEFAULT FALSE,
  pass_sent_via TEXT CHECK (pass_sent_via IN ('whatsapp', 'email', 'link')),
  pass_sent_at TIMESTAMPTZ,
  pass_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual guests
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES guest_groups(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in')),
  checked_in_at TIMESTAMPTZ,
  checked_in_method TEXT CHECK (checked_in_method IN ('qr', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scan log (audit trail)
CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES guest_groups(id) NOT NULL,
  scanner_id UUID REFERENCES organizers(id),
  result TEXT NOT NULL CHECK (result IN ('valid', 'already_used', 'invalid')),
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_guests_group_id ON guests(group_id);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_guest_groups_wedding_id ON guest_groups(wedding_id);
CREATE INDEX idx_guest_groups_pass_uuid ON guest_groups(pass_uuid);
CREATE INDEX idx_scan_logs_group_id ON scan_logs(group_id);
CREATE INDEX idx_scan_logs_scanned_at ON scan_logs(scanned_at);

-- Row Level Security (RLS)
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Policies: organizers can manage their own wedding data
CREATE POLICY "Organizers can view their wedding" ON weddings
  FOR SELECT USING (
    id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can update their wedding" ON weddings
  FOR UPDATE USING (
    id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can view their data" ON organizers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organizers can manage guest groups" ON guest_groups
  FOR ALL USING (
    wedding_id IN (SELECT wedding_id FROM organizers WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can manage guests" ON guests
  FOR ALL USING (
    group_id IN (
      SELECT gg.id FROM guest_groups gg
      JOIN organizers o ON o.wedding_id = gg.wedding_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can view scan logs" ON scan_logs
  FOR SELECT USING (
    scanner_id IN (SELECT id FROM organizers WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can insert scan logs" ON scan_logs
  FOR INSERT WITH CHECK (
    scanner_id IN (SELECT id FROM organizers WHERE user_id = auth.uid())
  );

-- Public access for guest pass pages (no auth required)
CREATE POLICY "Public can view pass by UUID" ON guest_groups
  FOR SELECT USING (true);

CREATE POLICY "Public can view guests in group" ON guests
  FOR SELECT USING (true);
