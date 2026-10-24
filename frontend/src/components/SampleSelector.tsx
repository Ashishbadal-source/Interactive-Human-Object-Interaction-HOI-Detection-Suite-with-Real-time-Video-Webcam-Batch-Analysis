import React from 'react';
import type { SampleImage } from '../types/hoi';
import { IconSparkles, IconZap } from './Icons';

interface SampleSelectorProps {
  samples: SampleImage[];
  selectedSample: string | null;
  onSelectSample: (sample: SampleImage) => void;
  isLoading: boolean;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  samples,
  selectedSample,
  onSelectSample,
  isLoading,
}) => {
  if (!samples || samples.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconSparkles size={16} color="var(--cyan-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Benchmark Test Gallery
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            1-Click Benchmark
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Standard HICO-DET evaluation samples
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '12px',
        overflowX: 'auto',
      }}>
        {samples.map((s, index) => {
          const isSelected = selectedSample === s.filename;
          return (
            <div
              key={s.filename}
              onClick={() => !isLoading && onSelectSample(s)}
              style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: isSelected ? '2px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 200ms ease',
                transform: isSelected ? 'scale(1.02)' : 'none',
                boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isSelected && !isLoading) {
                  e.currentTarget.style.borderColor = 'var(--border-active)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected && !isLoading) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              <div style={{ width: '100%', height: '80px', backgroundColor: 'var(--bg-deep)', overflow: 'hidden' }}>
                <img
                  src={s.url}
                  alt={s.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 200ms ease',
                  }}
                />
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Sample {index + 1}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {s.filename}
                </div>
              </div>

              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: '#06b6d4',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(6, 182, 212, 0.8)',
                }}>
                  <IconZap size={10} color="#fff" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
