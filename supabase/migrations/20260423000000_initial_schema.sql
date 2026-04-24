-- Initial Schema for Teatro Flow

CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    seat_number TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow authenticated users to read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read guests" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read tickets" ON public.tickets FOR SELECT TO authenticated USING (true);

-- Allow full access for service role or admin (can be refined later)
CREATE POLICY "Allow full access to events for authenticated" ON public.events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to guests for authenticated" ON public.guests FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to tickets for authenticated" ON public.tickets FOR ALL TO authenticated USING (true);
