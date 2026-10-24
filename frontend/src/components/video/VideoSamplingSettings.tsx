import React from 'react';
import { IconSliders, IconZap, IconClock } from '../Icons';

interface VideoSamplingSettingsProps {
  samplingMode: string;
  setSamplingMode: (mode: string) => void;
  samplingInterval: number;
  setSamplingInterval: (val: number) => void;
  maxFrames: number;
  setMaxFrames: (val: number) => void;
  manualTimestamps: string;
  setManualTimestamps: (val: string) => void;
  minActionScore: number;
  setMinActionScore: (val: number) => void;
  minObjectScore: number;
  setMinObjectScore: (val: number) => void;
  maxInteractions: number;
  setMaxInteractions: (val: number) => void;
  videoDuration: number;
  isProcessing: boolean;
  onStartAnalysis: () => void;
  hasVideo: boolean;
}

export const VideoSamplingSettings: React.FC<VideoSamplingSettingsProps> = ({
  samplingMode,
  setSamplingMode,
  samplingInterval,
  setSamplingInterval,
  maxFrames,
  setMaxFrames,
  manualTimestamps,
  setManualTimestamps,
  minActionScore,
  setMinActionScore,
  minObjectScore,
  setMinObjectScore,
  maxInteractions: _maxInteractions,
  setMaxInteractions: _setMaxInteractions,
  videoDuration,
  isProcessing,
  onStartAnalysis,
  hasVideo,
}) => {
  // Compute estimated frame count
  let estimatedFrames = 0;
  if (videoDuration > 0) {
    if (samplingMode === 'interval') {
      estimatedFrames = Math.min(maxFrames, Math.floor(videoDuration / Math.max(0.1, samplingInterval)) + 1);
    } else if (samplingMode === 'uniform') {
      estimatedFrames = maxFrames;
    } else if (samplingMode === 'manual') {
      const parts = manualTimestamps.split(',').filter(x => x.trim().length > 0);
      estimatedFrames = Math.min(maxFrames, parts.length);
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconSliders size={18} color="#06b6d4" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sampling & Inference Policy
        </span>
      </div>

      {/* Sampling Strategy Switcher */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Sampling Strategy
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          <button
            onClick={() => setSamplingMode('interval')}
            style={{
              padding: '7px 6px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: samplingMode === 'interval' ? 'linear-gradient(135deg, #06b6d4, #2563eb)' : 'rgba(30, 41, 59, 0.6)',
              color: samplingMode === 'interval' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Interval
          </button>
          <button
            onClick={() => setSamplingMode('uniform')}
            style={{
              padding: '7px 6px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: samplingMode === 'uniform' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(30, 41, 59, 0.6)',
              color: samplingMode === 'uniform' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Uniform
          </button>
          <button
            onClick={() => setSamplingMode('motion_adaptive')}
            style={{
              padding: '7px 6px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: samplingMode === 'motion_adaptive' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(30, 41, 59, 0.6)',
              color: samplingMode === 'motion_adaptive' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Motion
          </button>
          <button
            onClick={() => setSamplingMode('manual')}
            style={{
              padding: '7px 6px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: samplingMode === 'manual' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(30, 41, 59, 0.6)',
              color: samplingMode === 'manual' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Mode C: Motion Adaptive info */}
      {samplingMode === 'motion_adaptive' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '11px',
          color: '#fbbf24',
          lineHeight: 1.4,
        }}>
          <strong>Motion-Adaptive Sampling:</strong> Computes optical frame-difference energy across the video to concentrate MUREN inference on dynamic action moments.
        </div>
      )}

      {/* Mode A: Interval Options */}
      {samplingMode === 'interval' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Extract Frame Every:</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#38bdf8' }}>
              {samplingInterval.toFixed(1)}s
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[0.5, 1.0, 2.0, 4.0].map(val => (
              <button
                key={val}
                onClick={() => setSamplingInterval(val)}
                style={{
                  flex: 1,
                  padding: '5px',
                  borderRadius: '6px',
                  border: samplingInterval === val ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                  background: samplingInterval === val ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: samplingInterval === val ? '#22d3ee' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {val}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Timestamps Input */}
      {samplingMode === 'manual' && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Specific Timestamps (seconds, comma-separated):
          </div>
          <input
            type="text"
            value={manualTimestamps}
            onChange={e => setManualTimestamps(e.target.value)}
            placeholder="e.g. 0.0, 1.5, 3.0, 4.5, 6.0"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>
      )}

      {/* Maximum Sampled Frames Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Max Frames Budget (CPU Safe):</span>
          <span className="mono-metric" style={{ fontWeight: 600, color: '#c084fc' }}>
            {maxFrames} frames
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={maxFrames}
          onChange={e => setMaxFrames(parseInt(e.target.value, 10))}
          style={{ accentColor: '#8b5cf6' }}
        />
      </div>

      {/* Thresholds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Action (τ_v)</span>
            <span className="mono-metric" style={{ color: '#06b6d4', fontWeight: 600 }}>{minActionScore.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.80"
            step="0.05"
            value={minActionScore}
            onChange={e => setMinActionScore(parseFloat(e.target.value))}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Object (τ_o)</span>
            <span className="mono-metric" style={{ color: '#8b5cf6', fontWeight: 600 }}>{minObjectScore.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.95"
            step="0.05"
            value={minObjectScore}
            onChange={e => setMinObjectScore(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Frame Budget Estimation Pill */}
      {estimatedFrames > 0 && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: '#38bdf8',
        }}>
          <IconClock size={14} />
          <span>Estimated workload: <strong>~{estimatedFrames} frames</strong> (~{estimatedFrames * 1.2}s on CPU)</span>
        </div>
      )}

      {/* Start Button */}
      <button
        className="btn btn-glow-violet"
        onClick={onStartAnalysis}
        disabled={!hasVideo || isProcessing}
        style={{ padding: '12px', fontSize: '14px', width: '100%' }}
      >
        {isProcessing ? (
          <>
            <span className="spin-loader">⭮</span>
            <span>Running Video Analysis...</span>
          </>
        ) : (
          <>
            <IconZap size={16} />
            <span>Analyze Sampled Frames</span>
          </>
        )}
      </button>
    </div>
  );
};
