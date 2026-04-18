-- Add ladders, joints, and station to rental extra equipment
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS ladders INTEGER CHECK (ladders >= 0),
  ADD COLUMN IF NOT EXISTS joints INTEGER CHECK (joints >= 0),
  ADD COLUMN IF NOT EXISTS station TEXT,
  ADD COLUMN IF NOT EXISTS returned_ladders INTEGER DEFAULT 0 CHECK (returned_ladders >= 0),
  ADD COLUMN IF NOT EXISTS returned_joints INTEGER DEFAULT 0 CHECK (returned_joints >= 0);