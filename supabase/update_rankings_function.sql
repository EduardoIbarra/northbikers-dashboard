-- This script updates the participant ranking calculation logic to only include:
-- 1. Valid check-ins (is_valid = true)
-- 2. Routes marked as Euromotors (is_euromotors = true)
-- 3. Points earned from January 1st, 2026, onwards

-- We must drop the function first because CREATE OR REPLACE FUNCTION 
-- cannot change the return type if it differs from the existing one.
DROP FUNCTION IF EXISTS get_euromotors_rankings();

CREATE OR REPLACE FUNCTION get_euromotors_rankings()
RETURNS TABLE (
    profile_id UUID,
    name TEXT,
    total_points BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as profile_id,
        p.name::TEXT,
        COALESCE(SUM(c.points), 0)::BIGINT as total_points
    FROM profiles p
    JOIN check_ins c ON p.id = c.profile_id
    JOIN routes r ON c.route_id = r.id
    WHERE c.is_valid = true
      AND r.is_euromotors = true
      AND r.start_timestamp >= '2026-01-01'
    GROUP BY p.id, p.name
    ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql;
