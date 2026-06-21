DO $$
DECLARE
  target_route_id int := 243;
BEGIN

  DELETE FROM check_ins
  WHERE route_id = target_route_id;

  DELETE FROM feeds
  WHERE route_id = target_route_id;

  UPDATE event_profile
  SET points = 0
  WHERE route_id = target_route_id;

END $$;
