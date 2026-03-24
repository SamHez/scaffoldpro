-- URL Migration Script for ScaffoldPro
-- Run this in the Supabase SQL Editor to fix broken image links after project migration.

-- 1. Update Existing Storage URLs in the Rentals Table
-- This replaces any project's base URL with the new project URL for the 'rental-documents' bucket.
UPDATE public.rentals
SET document_image_url = regexp_replace(
    document_image_url, 
    '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/rental-documents/', 
    'https://newonjeveqhmwliwslpb.supabase.co/storage/v1/object/public/rental-documents/'
)
WHERE document_image_url IS NOT NULL;

-- 2. Performance Verification
-- Run this to check if URLs were updated correctly
-- SELECT id, document_image_url FROM public.rentals WHERE document_image_url IS NOT NULL LIMIT 10;
