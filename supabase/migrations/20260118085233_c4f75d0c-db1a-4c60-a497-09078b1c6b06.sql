-- Drop ALL foreign key constraints to auth.users (created_by, approved_by, rejected_by)
ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_created_by_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_approved_by_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_rejected_by_fkey;

-- Now change the column types from uuid to text
ALTER TABLE public.purchase_orders 
ALTER COLUMN created_by TYPE text USING created_by::text;

ALTER TABLE public.purchase_orders 
ALTER COLUMN approved_by TYPE text USING approved_by::text;

ALTER TABLE public.purchase_orders 
ALTER COLUMN rejected_by TYPE text USING rejected_by::text;