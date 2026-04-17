-- Fix inventory unique constraint for multi-tenancy
-- Drop the old unique constraint on item_name
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_item_name_key;

-- Add new unique constraint on (organization_id, item_name)
ALTER TABLE public.inventory ADD CONSTRAINT inventory_organization_id_item_name_key UNIQUE (organization_id, item_name);