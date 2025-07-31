-- Fix security warnings: Update auth configuration for better security

-- Update auth configuration to reduce OTP expiry time and enable leaked password protection
-- These are auth configuration changes, not schema changes

-- Set OTP expiry to recommended 10 minutes (600 seconds) instead of default 1 hour
UPDATE auth.config 
SET raw_config = jsonb_set(
  COALESCE(raw_config, '{}'),
  '{GOTRUE_OTP_EXPIRY}',
  '"600"'
);

-- Enable leaked password protection
UPDATE auth.config 
SET raw_config = jsonb_set(
  COALESCE(raw_config, '{}'),
  '{GOTRUE_PASSWORD_HMAC_SECRET}',
  '"true"'
);

-- Set strong password requirements
UPDATE auth.config 
SET raw_config = jsonb_set(
  COALESCE(raw_config, '{}'),
  '{GOTRUE_PASSWORD_MIN_LENGTH}',
  '"8"'
);

-- Note: Some auth config changes may require project restart to take effect