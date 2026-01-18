-- Drop foreign key constraint for po_download_logs downloaded_by
ALTER TABLE public.po_download_logs DROP CONSTRAINT IF EXISTS po_download_logs_downloaded_by_fkey;

-- Change downloaded_by from uuid to text
ALTER TABLE public.po_download_logs 
ALTER COLUMN downloaded_by TYPE text USING downloaded_by::text;