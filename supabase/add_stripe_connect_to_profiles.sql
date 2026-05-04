-- Add Stripe Connect fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Index para buscar rápido
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id);

-- Comentário para documentação
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connected Account ID (acct_...)';
COMMENT ON COLUMN profiles.stripe_connected_at IS 'Timestamp quando a conta Stripe foi conectada';
COMMENT ON COLUMN profiles.stripe_charges_enabled IS 'Se a conta pode receber charges';
COMMENT ON COLUMN profiles.stripe_payouts_enabled IS 'Se a conta pode receber payouts';
