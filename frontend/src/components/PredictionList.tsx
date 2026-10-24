import React, { useState } from 'react';
import type { Prediction } from '../types/hoi';
import { IconLayers, IconSparkles } from './Icons';

interface PredictionListProps {
  predictions: Prediction[];
  activeQueryId: number | null;
  onHoverPrediction: (queryId: number | null) => void;
}

export const PredictionList: React.FC<PredictionListProps> = ({
  predictions,
  activeQueryId,
  onHoverPrediction,
}) => {
  const [expandedQueryId, setExpandedQueryId] = useState<number | null>(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
          <IconLayers size={28} />
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          No Interactions Detected
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Run detection or adjust the action/object score thresholds to discover more candidate pairs.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconSparkles size={16} color="var(--violet-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Detected Interactions
          </span>
          <span className="badge badge-violet" style={{ fontSize: '11px' }}>
            {predictions.length} Active
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Hover to highlight on canvas
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
        {predictions.map((pred, idx) => {
          const isActive = activeQueryId === pred.query_id;
          const isExpanded = expandedQueryId === pred.query_id;

          const actionScorePct = Math.round(pred.primary_action_score * 100);
          const objectScorePct = Math.round(pred.object_score * 100);

          return (
            <div
              key={`pred-${pred.query_id}-${idx}`}
              onMouseEnter={() => onHoverPrediction(pred.query_id)}
              onMouseLeave={() => onHoverPrediction(null)}
              style={{
                borderRadius: '12px',
                padding: '14px',
                backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                border: isActive ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                boxShadow: isActive ? '0 0 20px rgba(6, 182, 212, 0.25)' : 'none',
                transition: 'all 150ms ease',
                cursor: 'pointer',
              }}
            >
              {/* Top Row: Rank, Triplet Headline */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                      person
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 700 }}>
                      → {pred.primary_action} →
                    </span>
                    <span className="badge badge-violet" style={{ fontSize: '11px' }}>
                      {pred.object_label}
                    </span>
                  </div>
                </div>

                <div className="mono-metric" style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: actionScorePct >= 60 ? '#34d399' : (actionScorePct >= 30 ? '#38bdf8' : '#fbbf24'),
                }}>
                  {actionScorePct}%
                </div>
              </div>

              {/* Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {/* Action Confidence Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <span>Action: <strong>{pred.primary_action}</strong></span>
                    <span className="mono-metric">{pred.primary_action_score.toFixed(3)}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(51, 65, 85, 0.4)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${actionScorePct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
                      borderRadius: '999px',
                    }} />
                  </div>
                </div>

                {/* Object Confidence Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <span>Object Detection: <strong>{pred.object_label}</strong></span>
                    <span className="mono-metric">{pred.object_score.toFixed(3)}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(51, 65, 85, 0.4)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${objectScorePct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6, #c084fc)',
                      borderRadius: '999px',
                    }} />
                  </div>
                </div>
              </div>

              {/* Toggle Alternative Candidates */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setExpandedQueryId(isExpanded ? null : pred.query_id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  {isExpanded ? 'Hide Alternative Actions ▲' : 'View Top 3 Actions ▼'}
                </button>
                <span className="mono-metric" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Query #{pred.query_id}
                </span>
              </div>

              {/* Expanded Top-3 Actions List */}
              {isExpanded && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(10, 15, 29, 0.6)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Top 3 Action Candidates
                  </div>
                  {pred.top3_actions.map((act, actIdx) => (
                    <div key={act.verb_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: actIdx === 0 ? '#38bdf8' : 'var(--text-secondary)' }}>
                        {actIdx + 1}. {act.verb_name}
                      </span>
                      <span className="mono-metric" style={{ color: actIdx === 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                        {(act.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}

                  {/* Bounding Box Coordinates */}
                  <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed rgba(148, 163, 184, 0.1)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <div>Subject Box: <code style={{ color: '#22d3ee' }}>[{pred.subject_box.map(Math.round).join(', ')}]</code></div>
                    <div>Object Box: <code style={{ color: '#c084fc' }}>[{pred.object_box.map(Math.round).join(', ')}]</code></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
