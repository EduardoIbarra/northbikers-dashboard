INSERT INTO profile_event_checkpoints (
  created_at,
  profile_id,
  route_id,
  event_checkpoint_id,
  "order",
  updated_at
)
SELECT
  NOW(),
  target_profiles.profile_id,
  pec.route_id,
  pec.event_checkpoint_id,
  pec."order",
  NOW()
FROM profile_event_checkpoints pec
CROSS JOIN (
  VALUES
    ('19605e66-a17a-4997-90e0-898cf24c122e'::uuid),
    ('9a33c00c-5326-47b0-9b11-0d92656c2375'::uuid),
    ('277fba15-42b9-45c5-9146-7524c56d6a4a'::uuid)
) AS target_profiles(profile_id)
WHERE pec.profile_id = 'dafe8d23-6b92-4d3e-8851-95bd7fb998a2'::uuid;