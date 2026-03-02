-- Make id_tin_no and phone nullable in clients table since they're optional when image is uploaded
ALTER TABLE public.clients 
ALTER COLUMN id_tin_no DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL;