-- Update thresholds for all existing projects to use new values
-- atRisk: 6.5 (65%), needsAttention: 7.5 (75%)

-- First, ensure all projects have a config
UPDATE projects
SET disengagement_config = '{
  "weights": {
    "deliverablesCompleted": 2.5,
    "meetingParticipation": 2.5,
    "commitmentFollowThrough": 2.5,
    "platformActivity": 2.5
  },
  "thresholds": {
    "atRisk": 6.5,
    "needsAttention": 7.5
  },
  "commitmentDecay": {
    "maxDays": 5,
    "style": "balanced"
  },
  "idleDecay": {
    "maxDays": 7,
    "style": "balanced"
  },
  "hardFlagTriggers": {
    "noLoginDays": {
      "enabled": true,
      "days": 4
    },
    "consecutiveLateSubmissions": {
      "enabled": true,
      "count": 2
    },
    "groupRiskThreshold": {
      "enabled": true,
      "percentage": 50
    }
  }
}'::jsonb
WHERE disengagement_config IS NULL;

-- Then update thresholds for all projects
UPDATE projects 
SET disengagement_config = jsonb_set(
  disengagement_config,
  '{thresholds}',
  '{"atRisk": 6.5, "needsAttention": 7.5}'::jsonb
);

-- For projects that don't have a config yet, set the full default config
UPDATE projects
SET disengagement_config = '{
  "weights": {
    "deliverablesCompleted": 2.5,
    "meetingParticipation": 2.5,
    "commitmentFollowThrough": 2.5,
    "platformActivity": 2.5
  },
  "thresholds": {
    "atRisk": 6.5,
    "needsAttention": 7.5
  },
  "commitmentDecay": {
    "maxDays": 5,
    "style": "balanced"
  },
  "idleDecay": {
    "maxDays": 7,
    "style": "balanced"
  },
  "hardFlagTriggers": {
    "noLoginDays": {
      "enabled": true,
      "days": 4
    },
    "consecutiveLateSubmissions": {
      "enabled": true,
      "count": 2
    },
    "groupRiskThreshold": {
      "enabled": true,
      "percentage": 50
    }
  }
}'::jsonb
WHERE disengagement_config IS NULL;
