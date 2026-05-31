-- Convert visibility column from text to boolean
-- 'show' -> true, anything else -> false

-- 1. Create a temporary column
ALTER TABLE checkpoints ADD COLUMN visibility_new BOOLEAN DEFAULT TRUE;

-- 2. Populate the new column
UPDATE checkpoints 
SET visibility_new = (CASE WHEN visibility = 'show' THEN TRUE ELSE FALSE END);

-- 3. Drop the old column
ALTER TABLE checkpoints DROP COLUMN visibility;

-- 4. Rename the new column to 'visibility'
ALTER TABLE checkpoints RENAME COLUMN visibility_new TO visibility;
