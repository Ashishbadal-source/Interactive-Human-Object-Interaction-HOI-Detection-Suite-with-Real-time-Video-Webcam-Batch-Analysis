import React, { useState } from 'react';
import type { FrameAnalysisResult } from '../../types/video';
import { IconLayers, IconSparkles, IconClock, IconSliders } from '../Icons';

interface FrameDetailPanelProps {
  selectedFrame: FrameAnalysisResult | null;
}

export const FrameDetailPanel: React.FC<FrameDetailPanelProps> = ({ selectedFrame }) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'annotated' | 'original'>('interactive');
  const [expandedQueryId, setExpandedQueryId] = useState<number | null>(null);
  const [hoveredQueryId, setHoveredQueryId] = useState<number | null>(null);
  const [pinnedQueryId, setPinnedQueryId] = useState<number | null>(null);

  if (!selectedFrame) {
    return (
      <div className="glass-panel" style={{
        padding: '32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '260px',
      }}>
        <IconLayers size={28} color="#94a3b8" />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginTop: '10px' }}>
          Select a Frame to Inspect Interactions
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Click any frame in the gallery or a timeline marker to view detected human-object interactions in detail.
        </div>
      </div>
    );
  }

  const hasPredictions = selectedFrame.predictions && selectedFrame.predictions.length > 0;
  const effectiveFocusedQueryId = pinnedQueryId !== null ? pinnedQueryId : hoveredQueryId;
  const originalFrameUrl = selectedFrame.annotated_frame_url.replace('_annotated', '_original');

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '12px' }}>
            Frame #{selectedFrame.frame_index}
          </span>
          <span className="badge badge-violet" style={{ fontSize: '12px' }}>
            <IconClock size={12} />
            <span>T = {selectedFrame.timestamp_seconds.toFixed(2)}s</span>
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({selectedFrame.width} × {selectedFrame.height}px • {selectedFrame.inference_time_ms} ms)
          </span>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('interactive')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'interactive' ? '#38bdf8' : 'transparent',
              color: viewMode === 'interactive' ? '#0f172a' : 'var(--text-secondary)',
            }}
          >
            Interactive Focus
          </button>
          <button
            onClick={() => setViewMode('annotated')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'annotated' ? '#06b6d4' : 'transparent',
              color: viewMode === 'annotated' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Baked Overlay
          </button>
          <button
            onClick={() => setViewMode('original')}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'original' ? '#8b5cf6' : 'transparent',
              color: viewMode === 'original' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Raw Frame
          </button>
        </div>
      </div>

      {/* Frame Visualizer Viewport */}
      <div style={{
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#020617',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxHeight: '440px',
      }}>
        {viewMode === 'interactive' ? (
          <div style={{ position: 'relative', width: '100%', height: 'auto', display: 'flex', justifyContent: 'center' }}>
            <img
              src={originalFrameUrl}
              alt={`Frame at ${selectedFrame.timestamp_seconds}s`}
              style={{ width: '100%', maxHeight: '440px', objectFit: 'contain', display: 'block' }}
            />

            {/* Interactive SVG Layer */}
            <svg
              viewBox={`0 0 ${selectedFrame.width} ${selectedFrame.height}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'auto',
              }}
            >
              <defs>
                <marker
                  id="frame-arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <filter id="f-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="f-glow-violet" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Render non-focused first, focused on top */}
              {[...selectedFrame.predictions].sort((a, b) => {
                if (a.query_id === effectiveFocusedQueryId) return 1;
                if (b.query_id === effectiveFocusedQueryId) return -1;
                return 0;
              }).map(pred => {
                const isHovered = effectiveFocusedQueryId === pred.query_id;
                const isAnyFocused = effectiveFocusedQueryId !== null;
                const opacity = !isAnyFocused ? 0.95 : (isHovered ? 1.0 : 0.12);

                const [sx1, sy1, sx2, sy2] = pred.subject_box;
                const [ox1, oy1, ox2, oy2] = pred.object_box;

                const scx = (sx1 + sx2) / 2;
                const scy = (sy1 + sy2) / 2;
                const ocx = (ox1 + ox2) / 2;
                const ocy = (oy1 + oy2) / 2;

                return (
                  <g
                    key={`frame-box-${pred.query_id}`}
                    opacity={opacity}
                    style={{ cursor: 'pointer', transition: 'all 180ms ease' }}
                    onMouseEnter={() => {
                      if (pinnedQueryId === null) setHoveredQueryId(pred.query_id);
                    }}
                    onMouseLeave={() => {
                      if (pinnedQueryId === null) setHoveredQueryId(null);
                    }}
                    onClick={() => {
                      setPinnedQueryId(pinnedQueryId === pred.query_id ? null : pred.query_id);
                    }}
                  >
                    {/* Action Arrow */}
                    <line
                      x1={scx}
                      y1={scy}
                      x2={ocx}
                      y2={ocy}
                      stroke={isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)'}
                      strokeWidth={isHovered ? 4.5 : 2}
                      strokeDasharray={isHovered ? 'none' : '6 4'}
                      filter={isHovered ? 'url(#f-glow-cyan)' : undefined}
                      markerEnd="url(#frame-arrow)"
                    />

                    {/* Subject Person Box (Cyan) */}
                    <rect
                      x={sx1}
                      y={sy1}
                      width={Math.max(1, sx2 - sx1)}
                      height={Math.max(1, sy2 - sy1)}
                      fill={isHovered ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.04)'}
                      stroke="#06b6d4"
                      strokeWidth={isHovered ? 4.5 : 2.5}
                      filter={isHovered ? 'url(#f-glow-cyan)' : undefined}
                    />

                    {/* Object Box (Violet) */}
                    <rect
                      x={ox1}
                      y={oy1}
                      width={Math.max(1, ox2 - ox1)}
                      height={Math.max(1, oy2 - oy1)}
                      fill={isHovered ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.04)'}
                      stroke="#8b5cf6"
                      strokeWidth={isHovered ? 4.5 : 2.5}
                      filter={isHovered ? 'url(#f-glow-violet)' : undefined}
                    />

                    {/* Label Badge */}
                    <g transform={`translate(${ox1}, ${Math.max(22, oy1 - 8)})`}>
                      <rect
                        x={0}
                        y={-20}
                        width={Math.min(300, (pred.object_label.length + pred.primary_action.length) * 8.5 + 75)}
                        height={24}
                        rx={6}
                        fill={isHovered ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.85)'}
                        stroke={isHovered ? '#06b6d4' : 'rgba(139, 92, 246, 0.6)'}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                      />
                      <text
                        x={8}
                        y={-4}
                        fill={isHovered ? '#38bdf8' : '#f8fafc'}
                        fontSize={isHovered ? '13px' : '12px'}
                        fontWeight="700"
                        fontFamily="sans-serif"
                      >
                        {pred.object_label} • {pred.primary_action} ({Math.round(pred.primary_action_score * 100)}%)
                        {pinnedQueryId === pred.query_id ? ' 📌' : ''}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <img
            src={viewMode === 'annotated' ? selectedFrame.annotated_frame_url : originalFrameUrl}
            alt={`Frame at ${selectedFrame.timestamp_seconds}s`}
            style={{ width: '100%', maxHeight: '440px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Frame Interactions List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconSparkles size={16} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              Detected Interactions for this Frame
            </span>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
            {selectedFrame.accepted_interactions_count} Accepted
          </span>
        </div>

        {!hasPredictions ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}>
            <p style={{ marginBottom: '4px', color: '#f8fafc', fontWeight: 600 }}>
              No interactions met the selected thresholds for this frame.
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              Try lowering the action score or object score threshold in the settings panel to reveal lower-confidence candidate pairs.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedFrame.predictions.map((pred, idx) => {
              const isExpanded = expandedQueryId === pred.query_id;
              const isHovered = effectiveFocusedQueryId === pred.query_id;
              const isPinned = pinnedQueryId === pred.query_id;
              const actionScorePct = Math.round(pred.primary_action_score * 100);

              return (
                <div
                  key={`frame-pred-${pred.query_id}-${idx}`}
                  onMouseEnter={() => {
                    if (pinnedQueryId === null) setHoveredQueryId(pred.query_id);
                  }}
                  onMouseLeave={() => {
                    if (pinnedQueryId === null) setHoveredQueryId(null);
                  }}
                  onClick={() => {
                    setPinnedQueryId(isPinned ? null : pred.query_id);
                  }}
                  style={{
                    borderRadius: '10px',
                    padding: '12px 14px',
                    backgroundColor: isHovered ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.7)',
                    border: isHovered ? '1.5px solid #06b6d4' : '1px solid var(--border-subtle)',
                    boxShadow: isHovered ? '0 0 14px rgba(6, 182, 212, 0.3)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                  }}
                >
                  {/* Triplet Headline */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      {isPinned && (
                        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginLeft: '4px' }}>
                          [PINNED]
                        </span>
                      )}
                    </div>

                    <div className="mono-metric" style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: actionScorePct >= 60 ? '#34d399' : (actionScorePct >= 30 ? '#38bdf8' : '#fbbf24'),
                    }}>
                      {actionScorePct}%
                    </div>
                  </div>

                  {/* Actions ranking list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {pred.top3_actions.map(act => (
                      <div
                        key={act.verb_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          padding: '2px 0',
                        }}
                      >
                        <span style={{ color: act.score === pred.primary_action_score ? '#38bdf8' : 'var(--text-secondary)' }}>
                          {act.verb_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '120px' }}>
                          <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(51, 65, 85, 0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.round(act.score * 100)}%`,
                              height: '100%',
                              backgroundColor: act.score === pred.primary_action_score ? '#06b6d4' : '#8b5cf6',
                            }} />
                          </div>
                          <span className="mono-metric" style={{ fontSize: '10px', width: '28px', textAlign: 'right' }}>
                            {Math.round(act.score * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expand Bounding Boxes Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedQueryId(isExpanded ? null : pred.query_id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IconSliders size={12} />
                      <span>{isExpanded ? 'Hide Coordinates' : 'View Coordinates'}</span>
                    </button>
                  </div>

                  {/* Coordinates Panel */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '6px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(51, 65, 85, 0.4)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                    }}>
                      <div>
                        <div style={{ color: '#06b6d4', fontWeight: 600, marginBottom: '2px' }}>
                          Subject Box [x1, y1, x2, y2]:
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          [{pred.subject_box.map(v => Math.round(v)).join(', ')}]
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#c084fc', fontWeight: 600, marginBottom: '2px' }}>
                          Object Box [x1, y1, x2, y2]:
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          [{pred.object_box.map(v => Math.round(v)).join(', ')}]
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
