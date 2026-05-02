-- Fix RLS for various tables to support team sharing (Multi-tenant context)
-- and fix legacy schema constraints in the guests and theaters tables.

-- 1. Fix Legacy Constraints
DO $$ 
BEGIN 
    -- Guests: theater_id should be optional (we use event_id now)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='theater_id') THEN
        ALTER TABLE public.guests ALTER COLUMN theater_id DROP NOT NULL;
    END IF;

    -- Theaters: slug should be optional (legacy routing logic)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='theaters' AND column_name='slug') THEN
        ALTER TABLE public.theaters ALTER COLUMN slug DROP NOT NULL;
    END IF;
END $$;

-- 2. Fix RLS for theaters (Localidades)
DROP POLICY IF EXISTS "Users can manage their own locations" ON theaters;
DROP POLICY IF EXISTS "Users and team manage locations" ON theaters;
CREATE POLICY "Users and team manage locations"
  ON theaters FOR ALL
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = theaters.user_id 
      AND team_members.member_id = auth.uid()
    )
  );

-- 3. Fix RLS for event_staff
DROP POLICY IF EXISTS "Users can manage staff for their own events" ON event_staff;
DROP POLICY IF EXISTS "Users and team manage event staff" ON event_staff;
CREATE POLICY "Users and team manage event staff"
  ON event_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_staff.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.owner_id = events.user_id 
          AND team_members.member_id = auth.uid()
        )
      )
    )
  );

-- 4. Fix RLS for event_benefits
DROP POLICY IF EXISTS "Users can manage benefits for their own events" ON event_benefits;
DROP POLICY IF EXISTS "Users and team manage event benefits" ON event_benefits;
CREATE POLICY "Users and team manage event benefits"
  ON event_benefits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_benefits.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.owner_id = events.user_id 
          AND team_members.member_id = auth.uid()
        )
      )
    )
  );

-- 5. Fix RLS for user_profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users and team see profile" ON user_profiles;
CREATE POLICY "Users and team see profile"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = user_profiles.id 
      AND team_members.member_id = auth.uid()
    )
  );
