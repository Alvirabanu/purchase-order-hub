-- ============================================
-- SUPABASE DATABASE SETUP FOR PO MANAGER
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('main_admin', 'po_creator', 'approval_admin');

-- 2. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'po_creator',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create vendors table
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    address TEXT,
    gst_number TEXT,
    contact_person_name TEXT,
    contact_person_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    unit TEXT CHECK (unit IN ('pcs', 'boxes')) DEFAULT 'pcs',
    default_po_quantity INTEGER DEFAULT 1,
    include_in_po BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create purchase_orders table
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL UNIQUE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('created', 'approved', 'rejected')) DEFAULT 'created',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create po_download_logs table
CREATE TABLE public.po_download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
    downloaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    location TEXT
);

-- 9. Create indexes for better performance
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_include_po ON public.products(include_in_po);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- 10. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_download_logs ENABLE ROW LEVEL SECURITY;

-- 11. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 12. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 13. RLS Policies for user_roles
CREATE POLICY "Users can view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role on signup"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 14. RLS Policies for vendors (all authenticated users can read)
CREATE POLICY "All authenticated users can view vendors"
    ON public.vendors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Main admin and po_creator can manage vendors"
    ON public.vendors FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'main_admin') OR 
        public.has_role(auth.uid(), 'po_creator')
    );

-- 15. RLS Policies for products
CREATE POLICY "All authenticated users can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Main admin and po_creator can manage products"
    ON public.products FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'main_admin') OR 
        public.has_role(auth.uid(), 'po_creator')
    );

-- 16. RLS Policies for purchase_orders
CREATE POLICY "All authenticated users can view POs"
    ON public.purchase_orders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "PO creators can create POs"
    ON public.purchase_orders FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'po_creator'));

CREATE POLICY "Approval admin can update PO status"
    ON public.purchase_orders FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'approval_admin'));

-- 17. RLS Policies for purchase_order_items
CREATE POLICY "All authenticated users can view PO items"
    ON public.purchase_order_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "PO creators can add PO items"
    ON public.purchase_order_items FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'po_creator'));

-- 18. RLS Policies for po_download_logs
CREATE POLICY "Approval admin can view and create download logs"
    ON public.po_download_logs FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'approval_admin'));

-- 19. Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'po_creator');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TO CREATE YOUR FIRST MAIN ADMIN:
-- After running the above, sign up a user normally,
-- then run this (replace USER_ID with the actual UUID):
-- 
-- UPDATE public.user_roles 
-- SET role = 'main_admin' 
-- WHERE user_id = 'YOUR-USER-UUID-HERE';
-- ============================================
