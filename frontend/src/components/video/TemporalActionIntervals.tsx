import React from 'react';
import type { ActionInterval } from '../../types/video';
import { IconSparkles, IconClock } from '../Icons';

interface TemporalActionIntervalsProps {
  intervals: ActionInterval[];
  onSeek: (timestamp: number) => void;
  videoDuration: number;
}

export const TemporalActionIntervals: React.FC<TemporalActionIntervalsProps> = ({
  intervals,
  onSeek,
  videoDuration,
}) => {
  if (!intervals || intervals.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconSparkles size={16} color="#c084fc" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Temporal Action Continuity & Trajectory Intervals ({intervals.length})
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Aggregated continuous interactions across video time
        </span>
      </div>

      {/* Action Intervals Grid / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {intervals.map((item) => {
          const peakPct = Math.round(item.peak_action_score * 100);
          const avgPct = Math.round(item.avg_action_score * 100);

          // Calculate visual timeline progress bar percentage if duration known
          const startPct = videoDuration > 0 ? (item.start_timestamp / videoDuration) * 100 : 0;
          const widthPct = videoDuration > 0 ? Math.max(3, (item.duration_seconds / videoDuration) * 100) : 10;

          return (
            <div
              key={item.interval_id}
              onClick={() => onSeek(item.start_timestamp)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 180ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#c084fc';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                    person
                  </span>
                  <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700 }}>
                    → {item.action} →
                  </span>
                  <span className="badge badge-violet" style={{ fontSize: '11px' }}>
                    {item.object_label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconClock size={11} />
                    <span>{item.start_timestamp.toFixed(1)}s - {item.end_timestamp.toFixed(1)}s ({item.duration_seconds.toFixed(1)}s)</span>
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: peakPct >= 60 ? '#34d399' : '#fbbf24',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Peak: {peakPct}% • Avg: {avgPct}%
                  </span>
                </div>
              </div>

              {/* Mini Temporal Progress Representation */}
              {videoDuration > 0 && (
                <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(51, 65, 85, 0.4)', borderRadius: '999px', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #06b6d4, #c084fc)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>Span: {item.frame_count} sampled frames ({item.sample_timestamps.map(t => `${t}s`).join(', ')})</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Click to jump player to {item.start_timestamp.toFixed(1)}s ↗</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
