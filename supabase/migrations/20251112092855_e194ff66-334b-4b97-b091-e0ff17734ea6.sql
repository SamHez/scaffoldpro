-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('CEO', 'COO', 'EMPLOYEE');

-- Create user role status enum
CREATE TYPE public.rental_status AS ENUM ('RENTED', 'RETURNED');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Anyone can view user roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user is CEO or COO
CREATE OR REPLACE FUNCTION public.is_ceo_or_coo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('CEO', 'COO')
  )
$$;

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT,
  id_tin_no TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (length(phone) = 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Anyone authenticated can view clients"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CEO and COO can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_ceo_or_coo(auth.uid()));

CREATE POLICY "CEO and COO can update clients"
  ON public.clients FOR UPDATE
  USING (public.is_ceo_or_coo(auth.uid()));

-- Create rentals table
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  status rental_status NOT NULL DEFAULT 'RENTED',
  
  -- Equipment (mandatory)
  num_scaffoldings INTEGER NOT NULL CHECK (num_scaffoldings >= 0),
  num_chopsticks INTEGER NOT NULL CHECK (num_chopsticks >= 0),
  plates INTEGER NOT NULL CHECK (plates >= 0),
  timbers INTEGER NOT NULL CHECK (timbers >= 0),
  connectors INTEGER NOT NULL CHECK (connectors >= 0),
  legs INTEGER NOT NULL CHECK (legs >= 0),
  
  -- Extra equipment (optional)
  tubes_6m INTEGER CHECK (tubes_6m >= 0),
  tubes_4m INTEGER CHECK (tubes_4m >= 0),
  tubes_3m INTEGER CHECK (tubes_3m >= 0),
  tubes_1m INTEGER CHECK (tubes_1m >= 0),
  
  -- Deal information (mandatory)
  price_per_scaffolding DECIMAL(10,2) NOT NULL CHECK (price_per_scaffolding >= 0),
  expected_days INTEGER NOT NULL CHECK (expected_days > 0),
  paid_days INTEGER NOT NULL CHECK (paid_days >= 0),
  
  -- Location (at least one required)
  country TEXT,
  province TEXT,
  district TEXT,
  
  -- Pickup info (mandatory)
  pickup_person_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  plate_number TEXT,
  
  rented_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  
  CONSTRAINT at_least_one_location CHECK (
    country IS NOT NULL OR province IS NOT NULL OR district IS NOT NULL
  )
);

-- Enable RLS on rentals
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Rentals policies
CREATE POLICY "Anyone authenticated can view rentals"
  ON public.rentals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CEO and COO can insert rentals"
  ON public.rentals FOR INSERT
  WITH CHECK (public.is_ceo_or_coo(auth.uid()));

CREATE POLICY "CEO and COO can update rentals"
  ON public.rentals FOR UPDATE
  USING (public.is_ceo_or_coo(auth.uid()));

-- Create audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policies - Only CEO can view audit logs
CREATE POLICY "CEO can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'CEO'));

-- Function to create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for audit logging
CREATE TRIGGER audit_clients_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

CREATE TRIGGER audit_rentals_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE')
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

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();