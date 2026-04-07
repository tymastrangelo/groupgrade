-- Add disengagement_config column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disengagement_config JSONB DEFAULT '{
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
}'::jsonb;

-- Update existing projects to have the default config if they don't have one
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
