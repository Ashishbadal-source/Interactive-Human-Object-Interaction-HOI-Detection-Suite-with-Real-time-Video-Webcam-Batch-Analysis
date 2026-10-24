import React from 'react';
import type { HealthResponse } from '../types/hoi';
import { IconCpu, IconSparkles, IconLayers, IconCamera, IconFiles, IconSun, IconMoon } from './Icons';

export type AppTab = 'photo' | 'video' | 'webcam' | 'batch';

interface HeaderProps {
  health: HealthResponse | null;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenArchitecture: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  activeTab,
  onTabChange,
  onOpenArchitecture,
  theme,
  onToggleTheme,
}) => {
  const isHealthy = health?.status === 'ok' && health?.model_loaded;

  return (
    <header className="glass-panel" style={{ margin: '16px 20px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
        }}>
          <IconSparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
              MUREN <span className="gradient-text-cyan">AI</span>
            </h1>
            <span className="badge badge-violet" style={{ fontSize: '11px', padding: '2px 8px' }}>
              HICO-DET v1.0
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Human-Object Interaction Detection • ResNet-50 Dual-Branch Transformer
          </p>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-card)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        gap: '4px',
      }}>
        <button
          onClick={() => onTabChange('photo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'photo' ? 'linear-gradient(135deg, #06b6d4, #2563eb)' : 'transparent',
            color: activeTab === 'photo' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'photo' ? '0 2px 10px rgba(6, 182, 212, 0.35)' : 'none',
          }}
        >
          <span>Photo</span>
        </button>

        <button
          onClick={() => onTabChange('video')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'video' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
            color: activeTab === 'video' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'video' ? '0 2px 10px rgba(139, 92, 246, 0.35)' : 'none',
          }}
        >
          <span>Video</span>
        </button>

        <button
          onClick={() => onTabChange('webcam')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'webcam' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'webcam' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'webcam' ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none',
          }}
        >
          <IconCamera size={14} />
          <span>Live Webcam</span>
        </button>

        <button
          onClick={() => onTabChange('batch')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            background: activeTab === 'batch' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
            color: activeTab === 'batch' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'batch' ? '0 2px 10px rgba(245, 158, 11, 0.35)' : 'none',
          }}
        >
          <IconFiles size={14} />
          <span>Batch Queue</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: isHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          fontSize: '12px',
          fontWeight: 600,
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? '#10b981' : '#f43f5e',
            boxShadow: isHealthy ? '0 0 8px #10b981' : '0 0 8px #f43f5e',
            display: 'inline-block'
          }} />
          <span style={{ color: isHealthy ? 'var(--emerald-primary)' : '#fb7185' }}>
            {health ? (isHealthy ? 'Engine Active (CPU)' : 'Engine Degraded') : 'Connecting...'}
          </span>
        </div>

        {/* Model Spec Pills */}
        <div className="badge badge-cyan" style={{ fontSize: '12px' }}>
          <IconCpu size={14} />
          <span>64 Queries • 80 Objs • 117 Verbs</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          className="btn btn-secondary"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ padding: '7px 11px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          {theme === 'dark' ? (
            <>
              <IconSun size={15} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Light</span>
            </>
          ) : (
            <>
              <IconMoon size={15} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Dark</span>
            </>
          )}
        </button>

        {/* Architecture Specs Modal Trigger */}
        <button
          className="btn btn-secondary"
          onClick={onOpenArchitecture}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <IconLayers size={14} />
          <span>Architecture</span>
        </button>
      </div>
    </header>
  );
};
