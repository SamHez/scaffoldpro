-- Create storage bucket for rental documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rental-documents', 'rental-documents', false);

-- Create storage policies for rental documents
CREATE POLICY "Authenticated users can view rental documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'rental-documents');

CREATE POLICY "CEO and COO can upload rental documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'rental-documents' AND 
  is_ceo_or_coo(auth.uid())
);

-- Add new fields to rentals table
ALTER TABLE public.rentals
ADD COLUMN document_image_url text,
ADD COLUMN returned_num_scaffoldings integer DEFAULT 0,
ADD COLUMN returned_num_chopsticks integer DEFAULT 0,
ADD COLUMN returned_plates integer DEFAULT 0,
ADD COLUMN returned_timbers integer DEFAULT 0,
ADD COLUMN returned_connectors integer DEFAULT 0,
ADD COLUMN returned_legs integer DEFAULT 0,
ADD COLUMN returned_tubes_6m integer DEFAULT 0,
ADD COLUMN returned_tubes_4m integer DEFAULT 0,
ADD COLUMN returned_tubes_3m integer DEFAULT 0,
ADD COLUMN returned_tubes_1m integer DEFAULT 0,
ADD COLUMN total_paid numeric DEFAULT 0,
ADD COLUMN balance_due numeric DEFAULT 0;