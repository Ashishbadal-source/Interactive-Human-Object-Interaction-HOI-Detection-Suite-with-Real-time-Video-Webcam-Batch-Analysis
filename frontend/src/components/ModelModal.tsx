import React from 'react';
import type { ModelInfoResponse } from '../types/hoi';
import { IconX, IconLayers, IconCpu, IconCheck } from './Icons';

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelInfo: ModelInfoResponse | null;
}

export const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, modelInfo }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="glass-panel-elevated fade-in" style={{
        maxWidth: '720px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <IconLayers size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>MUREN Architecture & Specifications</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Mutual Relation Enhancement Network for Human-Object Interaction Detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Spec Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}>
            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Backbone</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>ResNet-50</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transformer Layers</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#c084fc' }}>6 Enc + 6 Dec</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Queries</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#34d399' }}>{modelInfo?.num_queries || 64} Queries</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dataset</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>HICO-DET</div>
            </div>
          </div>

          {/* Model Description */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '10px' }}>
              <strong>MUREN</strong> addresses the limitations of standard two-stage and single-branch HOI detectors by introducing mutual relation enhancement. It models the intricate spatial and semantic correlations between human subjects and manipulated objects through a dual-query transformer decoder.
            </p>
            <p>
              Inference is executed strictly on the pretrained checkpoint (<code>pretrained/hico-best.pth</code>) without external heuristic replacements, ensuring authentic paper-grade benchmark outputs.
            </p>
          </div>

          {/* Architecture Pipeline Steps */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCpu size={16} color="#38bdf8" />
              <span>Inference Pipeline Breakdown</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>1</span>
                <span>Image preprocessing: Aspect-ratio preserving resize (shorter side 800px, max 1333px) + ImageNet mean/std normalization.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>2</span>
                <span>ResNet-50 visual feature extraction + 2D sinusoidal position encodings feed into 6-layer Transformer Encoder.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>3</span>
                <span>64 learned interaction queries process both subject and object bounding boxes simultaneously in the Transformer Decoder.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>4</span>
                <span>Dual MLP heads predict normalized subject box, object box, 80 object category logits, and 117 verb action logits.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>5</span>
                <span>Postprocessing converts normalized coordinates back to full image space and computes top ranked interaction triplets.</span>
              </div>
            </div>
          </div>

          {/* Verb Mapping Note Alert */}
          {modelInfo?.verb_mapping_note && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#d8b4fe',
              lineHeight: 1.5,
            }}>
              <strong>Note on Verb Taxonomy:</strong> {modelInfo.verb_mapping_note}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn btn-primary" onClick={onClose}>
              <IconCheck size={16} />
              <span>Understood</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
