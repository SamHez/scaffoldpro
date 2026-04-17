-- Add ladders and joints to rental extra equipment
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS ladders INTEGER CHECK (ladders >= 0),
  ADD COLUMN IF NOT EXISTS joints INTEGER CHECK (joints >= 0);