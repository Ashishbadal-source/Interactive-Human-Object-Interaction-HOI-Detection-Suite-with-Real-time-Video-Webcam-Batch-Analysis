import React, { useState, useRef } from 'react';
import type { Prediction } from '../types/hoi';
import {
  IconDownload,
  IconCode,
  IconCompare,
  IconCrosshair,
} from './Icons';

interface InteractiveCanvasProps {
  originalImageUrl: string | null;
  annotatedImageUrl: string | null;
  predictions: Prediction[];
  originalWidth: number;
  originalHeight: number;
  activeQueryId: number | null;
  onHoverPrediction: (queryId: number | null) => void;
  onOpenJson: () => void;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  originalImageUrl,
  annotatedImageUrl,
  predictions,
  originalWidth,
  originalHeight,
  activeQueryId,
  onHoverPrediction,
  onOpenJson,
}) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'annotated' | 'split' | 'xai'>('interactive');
  const [showSubjects, setShowSubjects] = useState<boolean>(true);
  const [showObjects, setShowObjects] = useState<boolean>(true);
  const [showConnectors, setShowConnectors] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for split view
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pinnedQueryId, setPinnedQueryId] = useState<number | null>(null);

  const effectiveFocusedQueryId = pinnedQueryId !== null ? pinnedQueryId : activeQueryId;

  const containerRef = useRef<HTMLDivElement>(null);

  if (!originalImageUrl && !annotatedImageUrl) {
    return (
      <div className="glass-panel" style={{
        height: '520px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'var(--bg-surface-elevated)',
          border: '1px dashed var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <IconCrosshair size={32} color="var(--text-muted)" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Ready for HOI Inference</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5 }}>
          Upload an image or pick a benchmark sample to detect human-object interactions, bounding boxes, and action relationships.
        </p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!annotatedImageUrl) return;
    const link = document.createElement('a');
    link.href = annotatedImageUrl;
    link.download = `muren_hoi_annotated.jpg`;
    link.click();
  };

  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'split' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setSplitPos((x / rect.width) * 100);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(10, 15, 29, 0.6)',
      }}>
        {/* Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('interactive')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'interactive' ? '#06b6d4' : 'transparent',
              color: viewMode === 'interactive' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Interactive Overlay
          </button>
          <button
            onClick={() => setViewMode('annotated')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'annotated' ? '#8b5cf6' : 'transparent',
              color: viewMode === 'annotated' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            Direct Annotated
          </button>
          <button
            onClick={() => setViewMode('split')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'split' ? '#2563eb' : 'transparent',
              color: viewMode === 'split' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            <IconCompare size={14} />
            <span>Split View</span>
          </button>
          <button
            onClick={() => setViewMode('xai')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'xai' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'transparent',
              color: viewMode === 'xai' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            <span>XAI Heatmap</span>
          </button>
        </div>

        {/* Layer Toggles (Visible in Interactive Mode) */}
        {viewMode === 'interactive' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: showSubjects ? '#22d3ee' : 'var(--text-muted)' }}>
              <input type="checkbox" checked={showSubjects} onChange={e => setShowSubjects(e.target.checked)} style={{ accentColor: '#06b6d4' }} />
              <span>Person (Cyan)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: showObjects ? '#c084fc' : 'var(--text-muted)' }}>
              <input type="checkbox" checked={showObjects} onChange={e => setShowObjects(e.target.checked)} style={{ accentColor: '#8b5cf6' }} />
              <span>Object (Violet)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: showConnectors ? '#38bdf8' : 'var(--text-muted)' }}>
              <input type="checkbox" checked={showConnectors} onChange={e => setShowConnectors(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
              <span>Vectors</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: showLabels ? '#e2e8f0' : 'var(--text-muted)' }}>
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} style={{ accentColor: '#06b6d4' }} />
              <span>Labels</span>
            </label>
          </div>
        )}

        {/* Actions (Download / JSON / Zoom) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <button onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.2))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px' }}>−</button>
            <span style={{ minWidth: '36px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 6px' }}>+</button>
            {zoomLevel !== 1 && (
              <button onClick={() => setZoomLevel(1)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px 4px', fontSize: '10px' }}>reset</button>
            )}
          </div>

          <button onClick={onOpenJson} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} title="Inspect JSON Output">
            <IconCode size={14} />
            <span>JSON</span>
          </button>

          {annotatedImageUrl && (
            <>
              {(() => {
                const parts = annotatedImageUrl.split('/');
                const rId = parts.length >= 4 ? parts[3] : null;
                if (!rId) return null;
                return (
                  <button
                    onClick={() => window.open(`/api/result/${rId}/report?format=html`, '_blank')}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '12px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)' }}
                    title="Open Academic Research & Audit Report (Print / PDF)"
                  >
                    <span>📄 Report</span>
                  </button>
                );
              })()}
              <button onClick={handleDownload} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} title="Download Annotated Image">
                <IconDownload size={14} />
                <span>Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '480px',
          maxHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#030712',
          overflow: 'auto',
          padding: '16px',
        }}
      >
        <div style={{
          position: 'relative',
          display: 'inline-block',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 150ms ease-out',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          overflow: 'hidden',
          maxWidth: '100%',
        }}>
          {/* Mode 1: Interactive SVG Overlay */}
          {viewMode === 'interactive' && (
            <div style={{ position: 'relative', display: 'block', lineHeight: 0 }}>
              <img
                src={originalImageUrl || annotatedImageUrl || ''}
                alt="Detection base"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  userSelect: 'none',
                }}
              />

              {originalWidth > 0 && originalHeight > 0 && (
                <svg
                  viewBox={`0 0 ${originalWidth} ${originalHeight}`}
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
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                    </marker>
                    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Sort predictions so active/hovered query renders on top */}
                  {[...predictions].sort((a, b) => {
                    if (a.query_id === effectiveFocusedQueryId) return 1;
                    if (b.query_id === effectiveFocusedQueryId) return -1;
                    return 0;
                  }).map(pred => {
                    const isHovered = effectiveFocusedQueryId === pred.query_id;
                    const isAnyFocused = effectiveFocusedQueryId !== null;
                    const opacity = !isAnyFocused ? 0.95 : (isHovered ? 1.0 : 0.12);

                    const [sx1, sy1, sx2, sy2] = pred.subject_box;
                    const [ox1, oy1, ox2, oy2] = pred.object_box;

                    // Centers
                    const scx = (sx1 + sx2) / 2;
                    const scy = (sy1 + sy2) / 2;
                    const ocx = (ox1 + ox2) / 2;
                    const ocy = (oy1 + oy2) / 2;

                    return (
                      <g
                        key={`hoi-${pred.query_id}`}
                        opacity={opacity}
                        style={{ cursor: 'pointer', transition: 'all 180ms ease' }}
                        onMouseEnter={() => {
                          if (pinnedQueryId === null) onHoverPrediction(pred.query_id);
                        }}
                        onMouseLeave={() => {
                          if (pinnedQueryId === null) onHoverPrediction(null);
                        }}
                        onClick={() => {
                          if (pinnedQueryId === pred.query_id) {
                            setPinnedQueryId(null);
                            onHoverPrediction(null);
                          } else {
                            setPinnedQueryId(pred.query_id);
                            onHoverPrediction(pred.query_id);
                          }
                        }}
                      >
                        {/* Connector line between person and object */}
                        {showConnectors && (
                          <line
                            x1={scx}
                            y1={scy}
                            x2={ocx}
                            y2={ocy}
                            stroke={isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)'}
                            strokeWidth={isHovered ? 4.5 : 2}
                            strokeDasharray={isHovered ? 'none' : '6 4'}
                            filter={isHovered ? 'url(#glow-cyan)' : undefined}
                            markerEnd="url(#arrow)"
                          />
                        )}

                        {/* Subject box (Cyan) */}
                        {showSubjects && (
                          <rect
                            x={sx1}
                            y={sy1}
                            width={Math.max(1, sx2 - sx1)}
                            height={Math.max(1, sy2 - sy1)}
                            fill={isHovered ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.04)'}
                            stroke="#06b6d4"
                            strokeWidth={isHovered ? 4.5 : 2.5}
                            filter={isHovered ? 'url(#glow-cyan)' : undefined}
                          />
                        )}

                        {/* Object box (Violet) */}
                        {showObjects && (
                          <rect
                            x={ox1}
                            y={oy1}
                            width={Math.max(1, ox2 - ox1)}
                            height={Math.max(1, oy2 - oy1)}
                            fill={isHovered ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.04)'}
                            stroke="#8b5cf6"
                            strokeWidth={isHovered ? 4.5 : 2.5}
                            filter={isHovered ? 'url(#glow-violet)' : undefined}
                          />
                        )}

                        {/* Label Badge */}
                        {showLabels && (
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
                              filter={isHovered ? 'url(#glow-cyan)' : undefined}
                            />
                            <text
                              x={8}
                              y={-4}
                              fill={isHovered ? '#38bdf8' : '#f8fafc'}
                              fontSize={isHovered ? "13px" : "12px"}
                              fontWeight="700"
                              fontFamily="sans-serif"
                            >
                              {pred.object_label} • {pred.primary_action} ({Math.round(pred.primary_action_score * 100)}%)
                              {pinnedQueryId === pred.query_id ? ' 📌' : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}

          {/* Mode 2: Direct Annotated Output from backend */}
          {viewMode === 'annotated' && (
            <img
              src={annotatedImageUrl || originalImageUrl || ''}
              alt="MUREN Annotated Detection"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
              }}
            />
          )}

          {/* Mode 3: Split Slider View */}
          {viewMode === 'split' && (
            <div style={{ position: 'relative', display: 'block', lineHeight: 0, userSelect: 'none' }}>
              {/* Bottom Layer: Annotated Image */}
              <img
                src={annotatedImageUrl || ''}
                alt="Annotated"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                }}
              />

              {/* Top Layer: Original Uploaded Image with clip-path */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
              }}>
                <img
                  src={originalImageUrl || ''}
                  alt="Original"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Split Divider Line */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${splitPos}%`,
                width: '3px',
                backgroundColor: '#06b6d4',
                boxShadow: '0 0 10px #06b6d4',
                cursor: 'ew-resize',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(6, 182, 212, 0.8)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  ⇄
                </div>
              </div>

              {/* Floating Labels */}
              <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px' }}>Raw Upload</span>
              </div>
              <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                <span className="badge badge-violet" style={{ fontSize: '10px' }}>HOI Detected</span>
              </div>
            </div>
          )}

          {/* Mode 4: XAI Transformer Attention Heatmap */}
          {viewMode === 'xai' && (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {(() => {
                const focusedPred = predictions.find(p => p.query_id === effectiveFocusedQueryId) || predictions[0];
                const heatmapSrc = focusedPred?.attention_heatmap_url;

                if (!heatmapSrc) {
                  return (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                        No Attention Heatmap Available for this Query
                      </p>
                      <p style={{ fontSize: '12px', margin: 0 }}>
                        Select or hover over an interaction in the list to inspect its cross-attention activation.
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={heatmapSrc}
                      alt="Explainable AI Attention Heatmap"
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '65vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.94)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
                    }}>
                      <div style={{ fontWeight: 700, color: '#fbbf24' }}>
                        MUREN Cross-Attention Activation (Query #{focusedPred.query_id})
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Action: <strong style={{ color: '#38bdf8' }}>{focusedPred.primary_action}</strong> • Target: <strong style={{ color: '#c084fc' }}>{focusedPred.object_label}</strong> ({Math.round(focusedPred.primary_action_score * 100)}%)
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        Warm spectrum (red/yellow) indicates spatial regions with highest relational energy during verb classification.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Canvas Status Footer */}
      <div style={{
        padding: '8px 18px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--text-muted)',
        background: 'rgba(10, 15, 29, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Resolution: <strong style={{ color: 'var(--text-secondary)' }}>{originalWidth} × {originalHeight}px</strong></span>
          <span>Interactions Shown: <strong style={{ color: '#06b6d4' }}>{predictions.length}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#06b6d4' }} /> Person (Subject)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#8b5cf6' }} /> Object
          </span>
        </div>
      </div>
    </div>
  );
};
