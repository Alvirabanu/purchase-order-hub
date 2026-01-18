-- Add po_status column to products table to persist product lifecycle state
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS po_status text NOT NULL DEFAULT 'available';

-- Add constraint to limit values
ALTER TABLE public.products 
ADD CONSTRAINT products_po_status_check 
CHECK (po_status IN ('available', 'queued', 'po_created'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_products_po_status ON public.products(po_status);