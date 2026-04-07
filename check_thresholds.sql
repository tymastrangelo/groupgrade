-- Check what thresholds are actually stored for each project
SELECT 
  id, 
  name, 
  disengagement_config->'thresholds'->>'atRisk' as at_risk,
  disengagement_config->'thresholds'->>'needsAttention' as needs_attention,
  disengagement_config->'thresholds' as full_thresholds
FROM projects 
ORDER BY name;
