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

-- 4. Re-create Policies
CREATE POLICY "Anyone authenticated can view inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "CEO and COO can update inventory" ON public.inventory FOR ALL USING (public.is_ceo_or_coo(auth.uid()));

-- 5. Seed Initial Stock
INSERT INTO public.inventory (item_name, total_stock, available_stock)
VALUES 
  ('Scaffoldings', 1000, 1000),
  ('Chopsticks', 5000, 5000),
  ('Plates', 2000, 2000),
  ('Timbers', 1500, 1500),
  ('Connectors', 8000, 8000),
  ('Legs', 3000, 3000)
ON CONFLICT (item_name) DO NOTHING;

-- 6. Ensure current user has CEO role (Run this if you get "Permission Denied")
-- This selects the most recent user and makes them CEO
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'CEO')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        UPDATE public.profiles SET role = 'CEO' WHERE id = v_user_id;
    END IF;
END $$;
