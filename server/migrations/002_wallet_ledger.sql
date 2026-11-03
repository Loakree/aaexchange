CREATE TABLE IF NOT EXISTS wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  available_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  held_minor BIGINT NOT NULL DEFAULT 0 CHECK (held_minor >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, currency)
);

CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('available', 'held')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'deposit', 'withdrawal', 'bet_hold', 'bet_release', 'bet_win', 'bet_loss', 'bet_void', 'adjustment'
  )),
  idempotency_key TEXT NOT NULL UNIQUE,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_ledger_customer_created_idx
  ON wallet_ledger_entries (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('deposit', 'withdrawal')),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'reversed')),
  requested_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  failure_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_provider_transaction_idx
  ON payment_transactions (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wagers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  provider_bet_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  selection_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('back', 'lay')),
  stake_minor BIGINT NOT NULL CHECK (stake_minor > 0),
  odds NUMERIC(12, 6) NOT NULL CHECK (odds > 1),
  potential_payout_minor BIGINT CHECK (potential_payout_minor >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'open', 'won', 'lost', 'void', 'rejected')),
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  settled_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL,
  settlement_note TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS wagers_provider_bet_idx
  ON wagers (provider_bet_id)
  WHERE provider_bet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wagers_customer_placed_idx
  ON wagers (customer_id, placed_at DESC);

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS settled_by UUID REFERENCES operator_accounts(id) ON DELETE SET NULL;
ALTER TABLE wagers ADD COLUMN IF NOT EXISTS settlement_note TEXT;
