-- Create Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  total_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "CEO and COO can update inventory" ON public.inventory FOR ALL USING (public.is_ceo_or_coo(auth.uid()));

-- Initial Seed for Inventory
INSERT INTO public.inventory (item_name, total_stock, available_stock)
VALUES 
  ('Scaffoldings', 1000, 1000),
  ('Chopsticks', 5000, 5000),
  ('Plates', 2000, 2000),
  ('Timbers', 1500, 1500),
  ('Connectors', 8000, 8000),
  ('Legs', 3000, 3000)
ON CONFLICT (item_name) DO NOTHING;
