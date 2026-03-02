-- Seed script for ScaffoldPro
-- Run this in the Supabase SQL Editor AFTER you have signed up for at least one account in the app.

DO $$
DECLARE
    v_user_id UUID;
    v_client_id_1 UUID;
    v_client_id_2 UUID;
    v_client_id_3 UUID;
BEGIN
    -- Disable audit triggers temporarily to avoid null value errors during seeding
    ALTER TABLE public.clients DISABLE TRIGGER audit_clients_changes;
    ALTER TABLE public.rentals DISABLE TRIGGER audit_rentals_changes;

    -- Get the ID of the first user in the profiles table
    -- (Assuming you have already signed up in the new project)
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user profile found. Please sign up in the app first so we have a user to associate the data with.';
        RETURN;
    END IF;

    -- Insert Sample Clients
    v_client_id_1 := gen_random_uuid();
    INSERT INTO public.clients (id, name, nickname, id_tin_no, phone, created_by)
    VALUES (v_client_id_1, 'Jean Bosco', 'Bosco Build', '1199887766', '0781234567', v_user_id);

    v_client_id_2 := gen_random_uuid();
    INSERT INTO public.clients (id, name, nickname, id_tin_no, phone, created_by)
    VALUES (v_client_id_2, 'Alice Mukamana', 'Alice Scaffolding', '1200001122', '0782223344', v_user_id);

    v_client_id_3 := gen_random_uuid();
    INSERT INTO public.clients (id, name, nickname, id_tin_no, phone, created_by)
    VALUES (v_client_id_3, 'Construction Bright Ltd', 'CBL', '2003334445', '0785556677', v_user_id);

    -- Insert Sample Rentals
    
    -- 1. Active Rental (Rented 2 days ago, 10 expected, paid for 5)
    INSERT INTO public.rentals (
        client_id, num_scaffoldings, num_chopsticks, plates, timbers, connectors, legs, 
        price_per_scaffolding, expected_days, paid_days, district, pickup_person_name, 
        vehicle_type, plate_number, rented_date, created_by, status, total_paid, balance_due
    ) VALUES (
        v_client_id_1, 10, 20, 10, 5, 20, 10, 
        5000, 10, 5, 'Kigali', 'Musa', 
        'Truck', 'RAE 123 A', now() - interval '2 days', v_user_id, 'RENTED', 250000, 250000
    );

    -- 2. Overdue/Unpaid Rental (Rented 15 days ago, 5 expected, 0 paid)
    INSERT INTO public.rentals (
        client_id, num_scaffoldings, num_chopsticks, plates, timbers, connectors, legs, 
        price_per_scaffolding, expected_days, paid_days, district, pickup_person_name, 
        vehicle_type, plate_number, rented_date, created_by, status, total_paid, balance_due
    ) VALUES (
        v_client_id_2, 5, 10, 5, 2, 10, 5, 
        5000, 5, 0, 'Musanze', 'Kamanzi', 
        'Pickup', 'RAB 456 B', now() - interval '15 days', v_user_id, 'RENTED', 0, 125000
    );

    -- 3. Partially Returned Rental (Rented 7 days ago, 20 scaffoldings, 10 returned)
    INSERT INTO public.rentals (
        client_id, num_scaffoldings, num_chopsticks, plates, timbers, connectors, legs, 
        price_per_scaffolding, expected_days, paid_days, district, pickup_person_name, 
        vehicle_type, plate_number, rented_date, created_by, status, 
        returned_num_scaffoldings, total_paid, balance_due
    ) VALUES (
        v_client_id_3, 20, 40, 20, 10, 40, 20, 
        5000, 30, 15, 'Rubavu', 'Gasana', 
        'Canter', 'RAC 789 C', now() - interval '7 days', v_user_id, 'RENTED', 
        10, 1500000, 1500000
    );

    -- 4. Completed Rental (Returned)
    INSERT INTO public.rentals (
        client_id, num_scaffoldings, num_chopsticks, plates, timbers, connectors, legs, 
        price_per_scaffolding, expected_days, paid_days, district, pickup_person_name, 
        vehicle_type, plate_number, rented_date, returned_date, created_by, status, 
        returned_num_scaffoldings, returned_num_chopsticks, returned_plates, returned_timbers, 
        returned_connectors, returned_legs, total_paid, balance_due
    ) VALUES (
        v_client_id_1, 2, 4, 2, 1, 4, 2, 
        5000, 3, 3, 'Kigali', 'Ntwari', 
        'Small Car', 'RAA 001 Z', now() - interval '4 days', now() - interval '1 day', v_user_id, 'RETURNED', 
        2, 4, 2, 1, 4, 2, 30000, 0
    );

    -- Re-enable audit triggers
    ALTER TABLE public.clients ENABLE TRIGGER audit_clients_changes;
    ALTER TABLE public.rentals ENABLE TRIGGER audit_rentals_changes;

    RAISE NOTICE 'Database successfully seeded with sample data.';
END $$;
