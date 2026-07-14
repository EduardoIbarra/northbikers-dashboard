-- SQL to create the route_logs table and its trigger
CREATE TABLE IF NOT EXISTS route_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action_type VARCHAR(100) NOT NULL,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_route_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_logs_updated_at ON route_logs;
CREATE TRIGGER trg_route_logs_updated_at
BEFORE UPDATE ON route_logs
FOR EACH ROW
EXECUTE FUNCTION update_route_logs_updated_at();
