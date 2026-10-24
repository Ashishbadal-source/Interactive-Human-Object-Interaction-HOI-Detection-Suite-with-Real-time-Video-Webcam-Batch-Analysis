import React, { useState } from 'react';
import type { PredictResponse } from '../types/hoi';
import { IconX, IconCopy, IconCheck, IconDownload, IconCode } from './Icons';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PredictResponse | null;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, data }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muren_hoi_${data.result_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="glass-panel-elevated fade-in" style={{
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconCode size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Raw Prediction Payload JSON</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '6px 12px', fontSize: '12px' }}>
              {copied ? <IconCheck size={14} color="#34d399" /> : <IconCopy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button className="btn btn-secondary" onClick={handleDownload} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <IconDownload size={14} />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#030712',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '16px',
        }}>
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#38bdf8',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  );
};
