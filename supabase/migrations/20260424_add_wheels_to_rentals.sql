-- Add wheels to rental equipment
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS wheels INTEGER DEFAULT 0 CHECK (wheels >= 0),
  ADD COLUMN IF NOT EXISTS returned_wheels INTEGER DEFAULT 0 CHECK (returned_wheels >= 0);
