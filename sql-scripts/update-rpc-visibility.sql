-- Redefine the function to include the 'visibility' column in the returned table.
-- This is necessary because the RPC returns a fixed table structure that doesn't 
-- automatically pick up new columns added to the 'checkpoints' table.

-- 1. We must drop the function first because CREATE OR REPLACE FUNCTION 
-- cannot change the return type if it differs from the existing one.
DROP FUNCTION IF EXISTS get_checkpoints_sorted_by_distance_2(float8, float8, int4, int4, int4);

-- 2. Recreate the function with all necessary columns including 'visibility'
CREATE OR REPLACE FUNCTION get_checkpoints_sorted_by_distance_2(
  user_lat float8, 
  user_lng float8, 
  from_index int4, 
  to_index int4, 
  category_id_input int4 default null
)
RETURNS TABLE (
  id int4,
  created_at timestamptz,
  lat float8,
  lng float8,
  name text,
  description text,
  points int4,
  icon text,
  picture text,
  updated_at timestamptz,
  route_id int4,
  terrain text,
  "order" int4,
  distance_difference float8,
  address text,
  "weakSignal" boolean,
  is_challenge boolean,
  category_id int4,
  visibility boolean,
  city text,
  state text,
  distance float8
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.created_at,
    c.lat,
    c.lng,
    c.name,
    c.description,
    c.points,
    c.icon,
    c.picture,
    c.updated_at,
    c.route_id,
    c.terrain,
    c.order,
    c.distance_difference,
    c.address,
    c.weakSignal,
    c.is_challenge,
    c.category_id,
    c.visibility,
    c.city,
    c.state,
    st_distance(st_point(c.lng, c.lat)::geography, st_point(user_lng, user_lat)::geography) / 1000.0 as distance
  FROM checkpoints c
  WHERE (category_id_input IS NULL OR c.category_id = category_id_input)
  ORDER BY distance ASC
  LIMIT (to_index - from_index + 1) OFFSET from_index;
END;
$$ LANGUAGE plpgsql;
