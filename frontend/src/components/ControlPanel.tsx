import React, { useRef } from 'react';
import {
  IconUpload,
  IconZap,
  IconSliders,
} from './Icons';

interface ControlPanelProps {
  onFileSelect: (file: File) => void;
  selectedFileName: string | null;
  minActionScore: number;
  setMinActionScore: (val: number) => void;
  minObjectScore: number;
  setMinObjectScore: (val: number) => void;
  maxInteractions: number;
  setMaxInteractions: (val: number) => void;
  isLoading: boolean;
  onRunInference: () => void;
  inferenceTimeMs: number | null;
  totalCandidates: number | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onFileSelect,
  selectedFileName,
  minActionScore,
  setMinActionScore,
  minObjectScore,
  setMinObjectScore,
  maxInteractions,
  setMaxInteractions,
  isLoading,
  onRunInference,
  inferenceTimeMs,
  totalCandidates,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload Zone */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Input Image
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-surface)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--cyan-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
          />
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            color: 'var(--cyan-primary)',
          }}>
            <IconUpload size={20} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {selectedFileName ? selectedFileName : 'Drop an image or click to browse'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Supports JPG, PNG (Max 20MB)
          </div>
        </div>
      </div>

      {/* Threshold Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <IconSliders size={14} color="#38bdf8" />
          <span>Inference Hyperparameters</span>
        </div>

        {/* Min Action Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Min Action Score (τ_v)</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#06b6d4' }}>
              {minActionScore.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.80"
            step="0.01"
            value={minActionScore}
            onChange={e => setMinActionScore(parseFloat(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Sensitive (0.05)</span>
            <span>Balanced (0.20)</span>
            <span>Strict (0.50+)</span>
          </div>
        </div>

        {/* Min Object Score */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Min Object Score (τ_o)</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#8b5cf6' }}>
              {minObjectScore.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.95"
            step="0.05"
            value={minObjectScore}
            onChange={e => setMinObjectScore(parseFloat(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Low (0.10)</span>
            <span>Default (0.50)</span>
            <span>High Conf (0.80+)</span>
          </div>
        </div>

        {/* Max Interactions Limit */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Max Interactions Limit</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#10b981' }}>
              {maxInteractions} pairs
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={maxInteractions}
            onChange={e => setMaxInteractions(parseInt(e.target.value, 10))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Top 1</span>
            <span>Top 5</span>
            <span>Top 20</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        className="btn btn-primary"
        onClick={onRunInference}
        disabled={isLoading || !selectedFileName}
        style={{ width: '100%', padding: '14px', fontSize: '15px' }}
      >
        {isLoading ? (
          <>
            <span className="spin-loader" style={{ display: 'inline-block' }}>⭮</span>
            <span>Processing with MUREN...</span>
          </>
        ) : (
          <>
            <IconZap size={18} />
            <span>Run MUREN Detection</span>
          </>
        )}
      </button>

      {/* Telemetry Status Card (if available) */}
      {inferenceTimeMs !== null && (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '10px',
          padding: '12px 14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Inference Latency</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#38bdf8' }}>
              {inferenceTimeMs} ms
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Query Candidates</span>
            <span className="mono-metric" style={{ fontWeight: 600, color: '#c084fc' }}>
              {totalCandidates} queries
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Execution Engine</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>PyTorch 2.1.2 CPU</span>
          </div>
        </div>
      )}
    </div>
  );
};
