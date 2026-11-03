CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS operator_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'support', 'auditor')),
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_accounts_email_lower_idx
  ON operator_accounts (LOWER(email));

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash BYTEA PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES operator_accounts(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx
  ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operator_id UUID REFERENCES operator_accounts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  remote_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS customer_login_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('provider', 'demo')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_login_events_created_idx
  ON customer_login_events (created_at DESC);
