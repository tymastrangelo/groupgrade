-- ============================================
-- GroupGrade Schema Updates for Projects
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds enhanced project metadata and tracking

-- Add new columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS expectations text,
ADD COLUMN IF NOT EXISTS deliverables text,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_class_id ON public.projects(class_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at);

-- Verify the changes
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'projects' 
-- ORDER BY ordinal_position;
