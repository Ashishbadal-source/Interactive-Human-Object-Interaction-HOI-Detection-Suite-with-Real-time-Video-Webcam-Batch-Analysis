import React from 'react';
import type { FrameAnalysisResult } from '../../types/video';
import { IconFilm } from '../Icons';

interface FrameGalleryProps {
  frames: FrameAnalysisResult[];
  selectedFrameId: string | null;
  onSelectFrame: (frame: FrameAnalysisResult) => void;
}

export const FrameGallery: React.FC<FrameGalleryProps> = ({
  frames,
  selectedFrameId,
  onSelectFrame,
}) => {
  if (!frames || frames.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconFilm size={16} color="#8b5cf6" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
            Analyzed Frame Gallery ({frames.length} frames)
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Click to inspect HOI predictions & sync player
        </span>
      </div>

      {/* Horizontal Scrollable Frame Cards */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        {frames.map((frame, idx) => {
          const isSelected = selectedFrameId === frame.frame_id;
          const hasDetections = frame.accepted_interactions_count > 0;
          const topScore = hasDetections
            ? Math.round(frame.predictions[0].primary_action_score * 100)
            : 0;

          return (
            <div
              key={frame.frame_id}
              onClick={() => onSelectFrame(frame)}
              style={{
                minWidth: '150px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-card)',
                border: isSelected ? '2px solid #06b6d4' : '1px solid var(--border-subtle)',
                boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                transform: isSelected ? 'scale(1.02)' : 'none',
              }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', height: '90px', backgroundColor: '#020617' }}>
                <img
                  src={frame.thumbnail_url}
                  alt={`Frame at ${frame.timestamp_seconds}s`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Timestamp Pill */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#38bdf8',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {frame.timestamp_seconds.toFixed(2)}s
                </div>

                {/* Score Pill if available */}
                {hasDetections && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(16, 185, 129, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    {topScore}%
                  </div>
                )}
              </div>

              {/* Card Footer Info */}
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    Frame #{idx + 1}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: hasDetections ? '#c084fc' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}>
                    {frame.accepted_interactions_count} {frame.accepted_interactions_count === 1 ? 'HOI' : 'HOIs'}
                  </span>
                </div>

                {hasDetections ? (
                  <div style={{
                    fontSize: '10px',
                    color: '#38bdf8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {frame.predictions[0].primary_action} • {frame.predictions[0].object_label}
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    No interaction
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
