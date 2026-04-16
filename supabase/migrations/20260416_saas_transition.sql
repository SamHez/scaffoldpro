-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    max_accounts INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Update user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ADMIN';

-- 3. Add organization_id to all relevant tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. Create default organization
INSERT INTO public.organizations (name, max_accounts)
VALUES ('Munezero Construction Ltd', 5)
ON CONFLICT DO NOTHING;

-- 5. Migrate existing data to the default organization
DO $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id FROM public.organizations WHERE name = 'Munezero Construction Ltd' LIMIT 1;
    
    UPDATE public.profiles SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE public.clients SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE public.rentals SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE public.inventory SET organization_id = org_id WHERE organization_id IS NULL;
    UPDATE public.audit_logs SET organization_id = org_id WHERE organization_id IS NULL;
END $$;

-- 6. Update handle_new_user trigger to handle organization_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE'),
    (NEW.raw_user_meta_data->>'organization_id')::UUID
  );
  
  -- Also insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE')
  );
  
  RETURN NEW;
END;
$$;

-- 7. Add account limit check trigger
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
BEGIN
    -- Get current count of users in the organization
    SELECT count(*) INTO current_count 
    FROM public.profiles 
    WHERE organization_id = NEW.organization_id;

    -- Get max limit for the organization
    SELECT max_accounts INTO max_limit 
    FROM public.organizations 
    WHERE id = NEW.organization_id;

    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'This organization has reached the maximum limit of % accounts.', max_limit;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_limit ON public.profiles;
CREATE TRIGGER tr_check_user_limit
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_limit();

-- 8. Update RLS Policies
-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can view clients" ON public.clients;
DROP POLICY IF EXISTS "CEO and COO can insert clients" ON public.clients;
DROP POLICY IF EXISTS "CEO and COO can update clients" ON public.clients;
DROP POLICY IF EXISTS "Anyone authenticated can view rentals" ON public.rentals;
DROP POLICY IF EXISTS "CEO and COO can insert rentals" ON public.rentals;
DROP POLICY IF EXISTS "CEO and COO can update rentals" ON public.rentals;
DROP POLICY IF EXISTS "CEO can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Anyone authenticated can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "CEO and COO can update inventory" ON public.inventory;

-- Profiles: Users can view profiles in their own organization
CREATE POLICY "Users can view org profiles"
    ON public.profiles FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Clients: Filtered by org
CREATE POLICY "Org clients select"
    ON public.clients FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Org clients insert"
    ON public.clients FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'COO') AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Org clients update"
    ON public.clients FOR UPDATE
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'COO') AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Rentals: Filtered by org
CREATE POLICY "Org rentals select"
    ON public.rentals FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Org rentals insert"
    ON public.rentals FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'COO') AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Org rentals update"
    ON public.rentals FOR UPDATE
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'COO') AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Inventory: Filtered by org
CREATE POLICY "Org inventory select"
    ON public.inventory FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Org inventory all"
    ON public.inventory FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'COO') AND
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Audit Logs: Filtered by org
CREATE POLICY "Org audit logs select"
    ON public.audit_logs FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('CEO', 'ADMIN') AND
        (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- 9. Function to auto-set organization_id from user's profile
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id 
        FROM public.profiles 
        WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

-- Apply triggers to auto-set organization_id
DROP TRIGGER IF EXISTS tr_set_org_clients ON public.clients;
CREATE TRIGGER tr_set_org_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS tr_set_org_rentals ON public.rentals;
CREATE TRIGGER tr_set_org_rentals BEFORE INSERT ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS tr_set_org_inventory ON public.inventory;
CREATE TRIGGER tr_set_org_inventory BEFORE INSERT ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS tr_set_org_audit ON public.audit_logs;
CREATE TRIGGER tr_set_org_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

-- 10. Seed inventory for new organization
CREATE OR REPLACE FUNCTION public.seed_org_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.inventory (item_name, total_stock, available_stock, organization_id)
    VALUES 
        ('Scaffoldings', 0, 0, NEW.id),
        ('Chopsticks', 0, 0, NEW.id),
        ('Plates', 0, 0, NEW.id),
        ('Timbers', 0, 0, NEW.id),
        ('Connectors', 0, 0, NEW.id),
        ('Legs', 0, 0, NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_seed_org_inventory ON public.organizations;
CREATE TRIGGER tr_seed_org_inventory
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.seed_org_inventory();
