"use client";

import { useState, useEffect } from 'react';

export type DecayConfig = {
  maxDays: number;
  style: 'balanced' | 'front' | 'back' | 'custom';
  customValues?: number[];
};

export type DisengagementConfig = {
  weights: {
    deliverablesCompleted: number;
    meetingParticipation: number;
    commitmentFollowThrough: number;
    platformActivity: number;
  };
  thresholds: {
    atRisk: number;
    needsAttention: number;
  };
  commitmentDecay: DecayConfig;
  idleDecay: DecayConfig;
  hardFlagTriggers: {
    noLoginDays: { enabled: boolean; days: number };
    consecutiveLateSubmissions: { enabled: boolean; count: number };
    groupRiskThreshold: { enabled: boolean; percentage: number };
  };
};

type DisengagementFlaggingConfigProps = {
  value: DisengagementConfig;
  onChange: (config: DisengagementConfig) => void;
};

export const DEFAULT_DISENGAGEMENT_CONFIG: DisengagementConfig = {
  weights: {
    deliverablesCompleted: 2.5,
    meetingParticipation: 2.5,
    commitmentFollowThrough: 2.5,
    platformActivity: 2.5,
  },
  thresholds: {
    atRisk: 6.5,
    needsAttention: 7.6,
  },
  commitmentDecay: {
    maxDays: 5,
    style: 'balanced',
  },
  idleDecay: {
    maxDays: 7,
    style: 'balanced',
  },
  hardFlagTriggers: {
    noLoginDays: { enabled: true, days: 4 },
    consecutiveLateSubmissions: { enabled: true, count: 2 },
    groupRiskThreshold: { enabled: true, percentage: 50 },
  },
};

export function DisengagementFlaggingConfig({ value, onChange }: DisengagementFlaggingConfigProps) {
  const [config, setConfig] = useState<DisengagementConfig>(value || DEFAULT_DISENGAGEMENT_CONFIG);
  const [activePreset, setActivePreset] = useState<'balanced' | 'deliverable' | 'participation' | 'custom'>('balanced');

  // Detect which preset matches the current weights
  useEffect(() => {
    const w = config.weights;
    if (w.deliverablesCompleted === 2.5 && w.meetingParticipation === 2.5 && 
        w.commitmentFollowThrough === 2.5 && w.platformActivity === 2.5) {
      setActivePreset('balanced');
    } else if (w.deliverablesCompleted === 4.0 && w.meetingParticipation === 2.0 && 
               w.commitmentFollowThrough === 2.0 && w.platformActivity === 2.0) {
      setActivePreset('deliverable');
    } else if (w.deliverablesCompleted === 2.0 && w.meetingParticipation === 4.0 && 
               w.commitmentFollowThrough === 2.0 && w.platformActivity === 2.0) {
      setActivePreset('participation');
    } else {
      setActivePreset('custom');
    }
  }, [config.weights]);

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const calculateTotalWeight = () => {
    const { weights } = config;
    return Object.values(weights).reduce((sum, val) => sum + val, 0);
  };

  const totalWeight = calculateTotalWeight();
  const isValid = Math.abs(totalWeight - 10.0) < 0.01;

  const updateWeight = (key: keyof typeof config.weights, value: number) => {
    setConfig(prev => ({
      ...prev,
      weights: { ...prev.weights, [key]: value }
    }));
    setActivePreset('custom');
  };

  const updateThreshold = (key: keyof typeof config.thresholds, value: number) => {
    setConfig(prev => ({
      ...prev,
      thresholds: { ...prev.thresholds, [key]: value }
    }));
  };

  const setPreset = (preset: 'balanced' | 'deliverable' | 'participation') => {
    setActivePreset(preset);
    
    if (preset === 'balanced') {
      setConfig(prev => ({
        ...prev,
        weights: {
          deliverablesCompleted: 2.5,
          meetingParticipation: 2.5,
          commitmentFollowThrough: 2.5,
          platformActivity: 2.5,
        },
        thresholds: { atRisk: 4.0, needsAttention: 7.0 },
      }));
    } else if (preset === 'deliverable') {
      setConfig(prev => ({
        ...prev,
        weights: {
          deliverablesCompleted: 4.0,
          meetingParticipation: 1.5,
          commitmentFollowThrough: 3.0,
          platformActivity: 1.5,
        },
        thresholds: { atRisk: 5.0, needsAttention: 7.5 },
      }));
    } else if (preset === 'participation') {
      setConfig(prev => ({
        ...prev,
        weights: {
          deliverablesCompleted: 2.0,
          meetingParticipation: 4.0,
          commitmentFollowThrough: 1.0,
          platformActivity: 3.0,
        },
        thresholds: { atRisk: 4.5, needsAttention: 7.0 },
      }));
    }
  };

  const calculateDecayValues = (maxDays: number, style: 'balanced' | 'front' | 'back'): number[] => {
    const values: number[] = [];
    for (let i = 0; i <= maxDays; i++) {
      const p = i / maxDays;
      let val = 0;
      if (style === 'front') {
        val = 100 * Math.pow(1 - p, 2.5);
      } else if (style === 'back') {
        val = 100 * (1 - Math.pow(p, 2.5));
      } else {
        val = 100 * (1 - p);
      }
      values.push(Math.round(val));
    }
    return values;
  };

  const getDecayValues = (decayConfig: DecayConfig): number[] => {
    if (decayConfig.style === 'custom' && decayConfig.customValues) {
      return decayConfig.customValues;
    }
    const style = decayConfig.style === 'custom' ? 'balanced' : decayConfig.style;
    return calculateDecayValues(decayConfig.maxDays, style);
  };

  const commitmentDecayValues = getDecayValues(config.commitmentDecay);
  const idleDecayValues = getDecayValues(config.idleDecay);

  return (
    <div className="flex flex-col gap-5">
      <div className="pb-3 border-b border-[#e5e7eb]">
        <h5 className="text-base font-bold text-[#111318] flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">flag</span>
          Disengagement Flagging
        </h5>
        <p className="text-xs text-[#616f89] mt-1">Configure automated student engagement tracking</p>
      </div>

      <div>
        <details open className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-lg bg-[#f9fafb] hover:bg-[#f3f4f6] transition-colors border border-[#e5e7eb]">
            <span className="text-sm font-bold text-primary">Configure Weighting & Status Levels</span>
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
          </summary>

          <div className="pt-6 space-y-6">
            {/* Total Weight Indicator */}
            <div className="p-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-[#616f89] uppercase tracking-widest">Total Weight:</span>
                <span className={`text-2xl font-black transition-colors ${
                  isValid ? 'text-green-600' : totalWeight > 10 ? 'text-red-600' : 'text-[#616f89]'
                }`}>
                  {totalWeight.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-[#616f89]">/ 10.0</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold ${
                  isValid ? 'text-green-600' : totalWeight > 10 ? 'text-red-600' : 'text-[#616f89]'
                }`}>
                  {isValid ? 'Ready to Initialize' : totalWeight > 10 ? `-${(totalWeight - 10).toFixed(1)} over` : `+${(10 - totalWeight).toFixed(1)} remaining`}
                </span>
                <span className={`material-symbols-outlined text-base ${
                  isValid ? 'text-green-600' : totalWeight > 10 ? 'text-red-600' : 'text-[#616f89]'
                }`}>
                  {isValid ? 'check_circle' : totalWeight > 10 ? 'warning' : 'info'}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-[#616f89] uppercase tracking-widest">Weighting Preset</label>
                {activePreset === 'custom' && (
                  <span className="text-xs font-bold text-primary">CUSTOM SETTINGS</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('balanced')}
                  className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                    activePreset === 'balanced'
                      ? 'border-primary bg-white text-primary shadow-sm'
                      : 'bg-[#f9fafb] border-transparent hover:border-[#e5e7eb] hover:bg-white text-[#111318]'
                  }`}
                >
                  Balanced
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('deliverable')}
                  className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                    activePreset === 'deliverable'
                      ? 'border-primary bg-white text-primary shadow-sm'
                      : 'bg-[#f9fafb] border-transparent hover:border-[#e5e7eb] hover:bg-white text-[#111318]'
                  }`}
                >
                  Deliverable-Focused
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('participation')}
                  className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                    activePreset === 'participation'
                      ? 'border-primary bg-white text-primary shadow-sm'
                      : 'bg-[#f9fafb] border-transparent hover:border-[#e5e7eb] hover:bg-white text-[#111318]'
                  }`}
                >
                  Participation-Focused
                </button>
              </div>
            </div>

            {/* Weight Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-[#111318]">Deliverables Completed</label>
                  <span className="text-sm font-mono font-bold text-primary bg-[#f0f4ff] px-2 py-0.5 rounded">
                    {config.weights.deliverablesCompleted.toFixed(1)} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={config.weights.deliverablesCompleted}
                  onChange={(e) => updateWeight('deliverablesCompleted', parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-[#111318]">Meeting Participation</label>
                  <span className="text-sm font-mono font-bold text-primary bg-[#f0f4ff] px-2 py-0.5 rounded">
                    {config.weights.meetingParticipation.toFixed(1)} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={config.weights.meetingParticipation}
                  onChange={(e) => updateWeight('meetingParticipation', parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-[#111318]">Commitment Follow-Through</label>
                  <span className="text-sm font-mono font-bold text-primary bg-[#f0f4ff] px-2 py-0.5 rounded">
                    {config.weights.commitmentFollowThrough.toFixed(1)} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={config.weights.commitmentFollowThrough}
                  onChange={(e) => updateWeight('commitmentFollowThrough', parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-[#111318]">Platform Activity / Idle Days</label>
                  <span className="text-sm font-mono font-bold text-primary bg-[#f0f4ff] px-2 py-0.5 rounded">
                    {config.weights.platformActivity.toFixed(1)} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={config.weights.platformActivity}
                  onChange={(e) => updateWeight('platformActivity', parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#e5e7eb] rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Student Status Thresholds */}
            <div className="pt-6 border-t border-[#e5e7eb] space-y-4">
              <h4 className="text-xs font-bold text-[#616f89] uppercase tracking-widest">Student Status Thresholds</h4>
              
              <div className="flex justify-between text-xs font-bold uppercase mb-4 px-1">
                <span className="text-red-600">At Risk (0 - {config.thresholds.atRisk.toFixed(1)})</span>
                <span className="text-amber-600">Needs Attention ({config.thresholds.atRisk.toFixed(1)} - {config.thresholds.needsAttention.toFixed(1)})</span>
                <span className="text-green-600">Healthy ({config.thresholds.needsAttention.toFixed(1)} - 10)</span>
              </div>

              <div className="relative h-8 mb-8">
                <div className="absolute inset-0 flex">
                  <div className="bg-red-100 rounded-l-full" style={{ width: `${config.thresholds.atRisk * 10}%` }} />
                  <div className="bg-amber-100" style={{ width: `${(config.thresholds.needsAttention - config.thresholds.atRisk) * 10}%` }} />
                  <div className="bg-green-100 rounded-r-full" style={{ width: `${(10 - config.thresholds.needsAttention) * 10}%` }} />
                </div>
                
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={config.thresholds.atRisk}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val < config.thresholds.needsAttention) {
                      updateThreshold('atRisk', val);
                    }
                  }}
                  className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
                  style={{ zIndex: 2 }}
                />
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={config.thresholds.needsAttention}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > config.thresholds.atRisk) {
                      updateThreshold('needsAttention', val);
                    }
                  }}
                  className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
                  style={{ zIndex: 1 }}
                />
              </div>
            </div>

            {/* Hard-Flag Triggers */}
            <div className="pt-6 border-t border-[#e5e7eb] space-y-4">
              <h4 className="text-xs font-bold text-[#616f89] uppercase tracking-widest">Hard-Flag Triggers</h4>
              
              <div className="space-y-3">
                <div className={`flex items-center gap-4 p-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] transition-all ${
                  !config.hardFlagTriggers.noLoginDays.enabled && 'opacity-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={config.hardFlagTriggers.noLoginDays.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      hardFlagTriggers: {
                        ...prev.hardFlagTriggers,
                        noLoginDays: { ...prev.hardFlagTriggers.noLoginDays, enabled: e.target.checked }
                      }
                    }))}
                    className="w-5 h-5 rounded border-[#e5e7eb] text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-primary block">No Login Activity</span>
                    <span className="text-xs text-[#616f89]">Student has not logged into the platform</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e5e7eb]">
                    <span className="text-xs font-bold text-[#616f89] uppercase tracking-wider">Flag if no login for</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={config.hardFlagTriggers.noLoginDays.days}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        hardFlagTriggers: {
                          ...prev.hardFlagTriggers,
                          noLoginDays: { ...prev.hardFlagTriggers.noLoginDays, days: parseInt(e.target.value) || 1 }
                        }
                      }))}
                      disabled={!config.hardFlagTriggers.noLoginDays.enabled}
                      className="w-12 h-8 text-center bg-white border border-[#e5e7eb] rounded focus:ring-2 focus:ring-primary text-sm font-bold"
                    />
                    <span className="text-xs font-semibold text-primary">days</span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] transition-all ${
                  !config.hardFlagTriggers.consecutiveLateSubmissions.enabled && 'opacity-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={config.hardFlagTriggers.consecutiveLateSubmissions.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      hardFlagTriggers: {
                        ...prev.hardFlagTriggers,
                        consecutiveLateSubmissions: { ...prev.hardFlagTriggers.consecutiveLateSubmissions, enabled: e.target.checked }
                      }
                    }))}
                    className="w-5 h-5 rounded border-[#e5e7eb] text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-primary block">Deliverable Follow-Through</span>
                    <span className="text-xs text-[#616f89]">Identifies repeated late submissions</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e5e7eb]">
                    <span className="text-xs font-bold text-[#616f89] uppercase tracking-wider">Flag if</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.hardFlagTriggers.consecutiveLateSubmissions.count}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        hardFlagTriggers: {
                          ...prev.hardFlagTriggers,
                          consecutiveLateSubmissions: { ...prev.hardFlagTriggers.consecutiveLateSubmissions, count: parseInt(e.target.value) || 1 }
                        }
                      }))}
                      disabled={!config.hardFlagTriggers.consecutiveLateSubmissions.enabled}
                      className="w-12 h-8 text-center bg-white border border-[#e5e7eb] rounded focus:ring-2 focus:ring-primary text-sm font-bold"
                    />
                    <span className="text-xs font-semibold text-primary">consecutive late</span>
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-4 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] transition-all ${
                  !config.hardFlagTriggers.groupRiskThreshold.enabled && 'opacity-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={config.hardFlagTriggers.groupRiskThreshold.enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      hardFlagTriggers: {
                        ...prev.hardFlagTriggers,
                        groupRiskThreshold: { ...prev.hardFlagTriggers.groupRiskThreshold, enabled: e.target.checked }
                      }
                    }))}
                    className="w-5 h-5 rounded border-[#e5e7eb] text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-primary block">Group Risk Threshold</span>
                    <span className="text-xs text-[#616f89]">Flags a group when a percentage of members are at risk</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e5e7eb]">
                    <span className="text-xs font-bold text-[#616f89] uppercase tracking-wider">Flag if</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={config.hardFlagTriggers.groupRiskThreshold.percentage}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        hardFlagTriggers: {
                          ...prev.hardFlagTriggers,
                          groupRiskThreshold: { ...prev.hardFlagTriggers.groupRiskThreshold, percentage: parseInt(e.target.value) || 1 }
                        }
                      }))}
                      disabled={!config.hardFlagTriggers.groupRiskThreshold.enabled}
                      className="w-12 h-8 text-center bg-white border border-[#e5e7eb] rounded focus:ring-2 focus:ring-primary text-sm font-bold"
                    />
                    <span className="text-xs font-semibold text-primary">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
