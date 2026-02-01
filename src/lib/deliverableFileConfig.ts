/**
 * Deliverable File Storage Setup Guide
 * ====================================
 * 
 * 1. DATABASE SETUP
 * Run these SQL commands in your Supabase SQL Editor:
 * 
 * -- Create deliverable_files table
 * CREATE TABLE public.deliverable_files (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   deliverable_id uuid NOT NULL,
 *   file_name text NOT NULL,
 *   file_size integer,
 *   file_type text,
 *   storage_path text NOT NULL,
 *   uploaded_by uuid NOT NULL,
 *   uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
 *   CONSTRAINT deliverable_files_pkey PRIMARY KEY (id),
 *   CONSTRAINT deliverable_files_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES public.deliverables(id) ON DELETE CASCADE,
 *   CONSTRAINT deliverable_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
 * );
 * 
 * -- Add indexes for better performance
 * CREATE INDEX idx_deliverable_files_deliverable_id ON public.deliverable_files(deliverable_id);
 * CREATE INDEX idx_deliverable_files_uploaded_by ON public.deliverable_files(uploaded_by);
 * 
 * -- Add JSONB column to deliverables if needed (optional, for denormalization)
 * ALTER TABLE public.deliverables 
 * ADD COLUMN submission_files jsonb DEFAULT '[]'::jsonb;
 * 
 * 2. STORAGE BUCKET SETUP
 * In Supabase Dashboard:
 * - Go to Storage
 * - Create a new bucket named "submissions"
 * - Set it to PRIVATE
 * - Add RLS Policy: Allow authenticated users to upload files in their own paths
 * 
 * SQL for RLS Policy:
 * CREATE POLICY "Allow users to upload files" 
 * ON storage.objects FOR INSERT 
 * WITH CHECK (
 *   auth.role() = 'authenticated' 
 *   AND (storage.foldername(name))[1] = 'deliverables'
 * );
 * 
 * CREATE POLICY "Allow users to read files" 
 * ON storage.objects FOR SELECT 
 * WITH CHECK (auth.role() = 'authenticated');
 * 
 * CREATE POLICY "Allow users to delete their files" 
 * ON storage.objects FOR DELETE 
 * USING (auth.role() = 'authenticated');
 * 
 * 3. USAGE IN COMPONENTS
 * 
 * import DeliverableFileUpload from '@/components/DeliverableFileUpload';
 * 
 * <DeliverableFileUpload 
 *   deliverableId={deliverable.id}
 *   onFilesUploaded={(files) => console.log('Files uploaded:', files)}
 *   readOnly={false}
 * />
 * 
 * 4. API ENDPOINTS
 * - POST /api/deliverables/[id]/upload - Upload files
 * - GET /api/deliverables/[id]/files - List files
 * - DELETE /api/deliverables/[id]/files - Delete a file
 * 
 * 5. ENVIRONMENT VARIABLES
 * Ensure these are set in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 */

export const DELIVERABLE_FILE_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'application/zip',
  ],
  STORAGE_BUCKET: 'submissions',
  STORAGE_PATH_PREFIX: 'deliverables',
};

export function isAllowedFileType(fileType: string): boolean {
  return DELIVERABLE_FILE_CONFIG.ALLOWED_FILE_TYPES.includes(fileType);
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('video')) return '🎥';
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
  return '📎';
}
