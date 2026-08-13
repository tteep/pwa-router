-- Create intent_history table if it does not already exist
CREATE TABLE IF NOT EXISTS intent_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_type   text NOT NULL,
  dest_display_name text,
  result        text NOT NULL DEFAULT 'success',
  latency_ms    integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS intent_history_user_created
  ON intent_history (user_id, created_at DESC);

-- RLS
ALTER TABLE intent_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own history"
  ON intent_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own history"
  ON intent_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
