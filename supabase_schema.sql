-- ============================================================================
-- STUDYSHARE — SUPABASE DATABASE & STORAGE SCHEMA
-- GPJ 2023–2026 Notes Hub
-- "Share Knowledge. Help Someone Learn."
-- 
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- It creates all tables, indexes, RLS policies, Storage bucket, and RPC functions.
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Table: notes (Shared educational notes catalog)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  academic_year TEXT DEFAULT '2023–2026',
  semester TEXT DEFAULT 'CO3K',
  course TEXT DEFAULT 'Government Polytechnic Jintur (GPJ)',
  subject TEXT NOT NULL,
  material_type TEXT DEFAULT 'Notes',
  tags TEXT[] DEFAULT '{}',
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  download_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON public.notes (semester);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON public.notes (subject);

-- Table: tips (Student 3-word tips)
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  tip_text TEXT NOT NULL,
  edit_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_note_id ON public.tips (note_id);

-- Table: reports (Peer moderation reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID,
  reporter_name TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: security_events (Demo technical monitoring log - non-sensitive)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  note_id TEXT,
  tip_id TEXT,
  anonymous_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: activity_log (Recent transparent activity)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  action_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. STORED PROCEDURES / RPC FUNCTIONS
-- ============================================================================

-- Atomic increment for download count
CREATE OR REPLACE FUNCTION public.increment_download(target_note_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notes
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = target_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic increment/decrement for helpful count
CREATE OR REPLACE FUNCTION public.toggle_helpful_count(target_note_id UUID, delta INT)
RETURNS void AS $$
BEGIN
  UPDATE public.notes
  SET helpful_count = GREATEST(0, COALESCE(helpful_count, 0) + delta)
  WHERE id = target_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for notes (Open access for diploma students)
DROP POLICY IF EXISTS "Public notes select" ON public.notes;
CREATE POLICY "Public notes select" ON public.notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notes insert" ON public.notes;
CREATE POLICY "Public notes insert" ON public.notes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public notes update" ON public.notes;
CREATE POLICY "Public notes update" ON public.notes FOR UPDATE USING (true);

-- Policies for tips
DROP POLICY IF EXISTS "Public tips select" ON public.tips;
CREATE POLICY "Public tips select" ON public.tips FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public tips insert" ON public.tips;
CREATE POLICY "Public tips insert" ON public.tips FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public tips update" ON public.tips;
CREATE POLICY "Public tips update" ON public.tips FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public tips delete" ON public.tips;
CREATE POLICY "Public tips delete" ON public.tips FOR DELETE USING (true);

-- Policies for reports
DROP POLICY IF EXISTS "Public reports insert" ON public.reports;
CREATE POLICY "Public reports insert" ON public.reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public reports select" ON public.reports;
CREATE POLICY "Public reports select" ON public.reports FOR SELECT USING (true);

-- Policies for security_events
DROP POLICY IF EXISTS "Public security_events insert" ON public.security_events;
CREATE POLICY "Public security_events insert" ON public.security_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public security_events select" ON public.security_events;
CREATE POLICY "Public security_events select" ON public.security_events FOR SELECT USING (true);

-- Policies for activity_log
DROP POLICY IF EXISTS "Public activity_log select" ON public.activity_log;
CREATE POLICY "Public activity_log select" ON public.activity_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public activity_log insert" ON public.activity_log;
CREATE POLICY "Public activity_log insert" ON public.activity_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. STORAGE BUCKET: notes
-- ============================================================================

-- Create public storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes',
  'notes',
  true,
  52428800, -- 50 MB Free tier limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies for the 'notes' bucket
DROP POLICY IF EXISTS "Public read notes bucket" ON storage.objects;
CREATE POLICY "Public read notes bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'notes');

DROP POLICY IF EXISTS "Public insert notes bucket" ON storage.objects;
CREATE POLICY "Public insert notes bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notes');

DROP POLICY IF EXISTS "Public update notes bucket" ON storage.objects;
CREATE POLICY "Public update notes bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'notes');

DROP POLICY IF EXISTS "Public delete notes bucket" ON storage.objects;
CREATE POLICY "Public delete notes bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'notes');
