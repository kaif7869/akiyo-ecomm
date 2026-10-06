CREATE TABLE IF NOT EXISTS akiyo_orders (
  transaction_id TEXT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  items JSONB NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed')),
  email_status TEXT NOT NULL CHECK (email_status IN ('pending', 'sending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);