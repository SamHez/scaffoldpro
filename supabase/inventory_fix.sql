-- 1. Create Inventory Table if missing
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  total_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid errors on re-run
DROP POLICY IF EXISTS "Anyone authenticated can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "CEO and COO can update inventory" ON public.inventory;

-- 4. Re-create Utility Functions (needed for policies)
CREATE OR REPLACE FUNCTION public.is_ceo_or_coo(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('CEO', 'COO')
  );
$$;

-- 5. Re-create Inventory Policies
CREATE POLICY "Anyone authenticated can view inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "CEO and COO can update inventory" ON public.inventory FOR ALL USING (public.is_ceo_or_coo(auth.uid()));

-- 6. Setup Storage Bucket and Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rental-documents', 'rental-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies to avoid errors
DROP POLICY IF EXISTS "Authenticated users can view rental documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view rental documents" ON storage.objects;
DROP POLICY IF EXISTS "CEO and COO can upload rental documents" ON storage.objects;

CREATE POLICY "Public can view rental documents" 
ON storage.objects FOR SELECT USING (bucket_id = 'rental-documents');

CREATE POLICY "CEO and COO can upload rental documents" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rental-documents' AND 
  public.is_ceo_or_coo(auth.uid())
);

-- 7. Additional policies and constraint fixes
-- Fix the phone check constraint to allow NULL (important when image is uploaded)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_phone_check CHECK (phone IS NULL OR length(phone) = 10);

-- Missing DELETE Policies from original migrations
DROP POLICY IF EXISTS "CEO and COO can delete rentals" ON public.rentals;
CREATE POLICY "CEO and COO can delete rentals" ON public.rentals FOR DELETE USING (public.is_ceo_or_coo(auth.uid()));

DROP POLICY IF EXISTS "CEO and COO can delete clients" ON public.clients;
CREATE POLICY "CEO and COO can delete clients" ON public.clients FOR DELETE USING (public.is_ceo_or_coo(auth.uid()));

-- Ensure financial columns exist (they were added in a later migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rentals' AND column_name='total_paid') THEN
        ALTER TABLE public.rentals ADD COLUMN total_paid numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rentals' AND column_name='balance_due') THEN
        ALTER TABLE public.rentals ADD COLUMN balance_due numeric DEFAULT 0;
    END IF;
END $$;

-- 8. Seed Initial Stock
INSERT INTO public.inventory (item_name, total_stock, available_stock)
VALUES 
  ('Scaffoldings', 1000, 1000),
  ('Chopsticks', 5000, 5000),
  ('Plates', 2000, 2000),
  ('Timbers', 1500, 1500),
  ('Connectors', 8000, 8000),
  ('Legs', 3000, 3000)
ON CONFLICT (item_name) DO NOTHING;

-- 9. Ensure current user has CEO role
-- This selects the most recent user and makes them CEO
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Insert into user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'CEO')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Sync role in profiles
        UPDATE public.profiles SET role = 'CEO' WHERE id = v_user_id;
    END IF;
END $$;
