-- Script to delete specified checkpoints and cascade delete all referencing records across database tables

BEGIN;

-- 1. Identify target checkpoint IDs into temporary table
CREATE TEMP TABLE target_checkpoints AS
SELECT id, name FROM checkpoints 
WHERE LOWER(TRIM(name)) IN (
  LOWER('Escuela rural Vicente Guerrero'),
  LOWER('Selfie con el kiosko'),
  LOWER('FOTO EL LETRERO CHARCO AZUL'),
  LOWER('Jardin mineral de pozos'),
  LOWER('Plaza del Minero')
);

-- 2. Identify associated event_checkpoint IDs
CREATE TEMP TABLE target_event_checkpoints AS
SELECT id FROM event_checkpoints 
WHERE checkpoint_id IN (SELECT id FROM target_checkpoints);

-- 3. Delete dependent records in profile_event_checkpoints
DELETE FROM profile_event_checkpoints 
WHERE event_checkpoint_id IN (SELECT id FROM target_event_checkpoints);

-- 4. Delete dependent records in pick_checkpoints (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pick_checkpoints') THEN
        DELETE FROM pick_checkpoints WHERE event_checkpoint_id IN (SELECT id FROM target_event_checkpoints);
    END IF;
END $$;

-- 5. Delete dependent records in event_checkpoints
DELETE FROM event_checkpoints 
WHERE checkpoint_id IN (SELECT id FROM target_checkpoints);

-- 6. Delete dependent records in checkpoint_logs (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checkpoint_logs') THEN
        DELETE FROM checkpoint_logs WHERE checkpoint_id IN (SELECT id FROM target_checkpoints);
    END IF;
END $$;

-- 7. Delete dependent records in check_ins (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins') THEN
        DELETE FROM check_ins WHERE checkpoint_id IN (SELECT id FROM target_checkpoints);
    END IF;
END $$;

-- 8. Delete dependent records in feeds (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feeds') THEN
        DELETE FROM feeds WHERE checkpoint_id IN (SELECT id FROM target_checkpoints);
    END IF;
END $$;

-- 9. Delete target checkpoints from main checkpoints table
DELETE FROM checkpoints 
WHERE id IN (SELECT id FROM target_checkpoints);

-- Clean up temp tables
DROP TABLE IF EXISTS target_event_checkpoints;
DROP TABLE IF EXISTS target_checkpoints;

COMMIT;
