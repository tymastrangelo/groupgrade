-- Update needsAttention threshold to 7.6 so 75% is included in watch
UPDATE projects 
SET disengagement_config = jsonb_set(
  disengagement_config,
  '{thresholds,needsAttention}',
  '7.6'::jsonb
);
