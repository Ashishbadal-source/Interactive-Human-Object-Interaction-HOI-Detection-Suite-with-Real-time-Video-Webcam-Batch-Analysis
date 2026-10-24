import React from 'react';
import type { VideoJobStatus } from '../../types/video';
import { IconCpu, IconX } from '../Icons';

interface VideoProcessingProgressProps {
  status: VideoJobStatus | null;
  onCancel: () => void;
}

export const VideoProcessingProgress: React.FC<VideoProcessingProgressProps> = ({
  status,
  onCancel,
}) => {
  if (!status || status.status === 'queued') return null;

  const isFailed = status.status === 'failed';
  const isRunning = status.status === 'processing' || status.status === 'decoding';

  return (
    <div className="glass-panel" style={{
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      border: isRunning ? '1px solid rgba(6, 182, 212, 0.4)' : (isFailed ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)'),
      background: isRunning ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.75)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCpu size={16} color={isRunning ? '#06b6d4' : '#c084fc'} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
            {status.message || 'Processing Video...'}
          </span>
        </div>

        {isRunning && (
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#fb7185',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconX size={14} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(51, 65, 85, 0.4)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          width: `${status.progress_percent}%`,
          height: '100%',
          background: isFailed ? '#f43f5e' : 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
          borderRadius: '999px',
          transition: 'width 250ms ease-out',
        }} />
      </div>

      {/* Status Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div>
          Progress: <strong style={{ color: '#fff' }}>{status.progress_percent}%</strong> ({status.processed_frames} / {status.total_frames_to_process} frames)
        </div>
        {status.current_timestamp > 0 && (
          <div className="mono-metric" style={{ color: '#38bdf8' }}>
            Timestamp: {status.current_timestamp.toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
};
