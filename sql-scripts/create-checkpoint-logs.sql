-- SQL to create the checkpoint_logs table and its trigger
CREATE TABLE IF NOT EXISTS checkpoint_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_id BIGINT NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_checkpoint_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkpoint_logs_updated_at
BEFORE UPDATE ON checkpoint_logs
FOR EACH ROW
EXECUTE FUNCTION update_checkpoint_logs_updated_at();
