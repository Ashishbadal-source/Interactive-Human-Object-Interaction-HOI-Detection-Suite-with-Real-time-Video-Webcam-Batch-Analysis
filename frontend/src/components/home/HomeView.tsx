import React from 'react';
import type { AppTab } from '../Header';
import type { HealthResponse, SampleImage } from '../../types/hoi';
import { 
  IconSparkles, 
  IconCamera, 
  IconVideo, 
  IconFiles, 
  IconImage, 
  IconCpu
} from '../Icons';

interface HomeViewProps {
  onNavigate: (tab: AppTab) => void;
  onOpenArchitecture: () => void;
  samples: SampleImage[];
  onSelectSample: (sample: SampleImage) => void;
  health: HealthResponse | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenArchitecture,
  samples,
  onSelectSample,
  health,
}) => {
  const isHealthy = health?.status === 'ok' && health?.model_loaded;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '30px' }}>
      
      {/* ===================== HERO SECTION ===================== */}
      <div className="glass-panel" style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '48px 36px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.12) 100%)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Ambient background glow dots */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '10%',
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '850px' }}>
          {/* Top Pill Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--cyan-primary)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
            }}>
              <IconSparkles size={14} /> CVPR 2023 Research Implementation
            </span>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'rgba(139, 92, 246, 0.15)',
              color: 'var(--violet-primary)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
            }}>
              5th Sem Computer Vision • Ashish Badal
            </span>

            {isHealthy && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--emerald-primary)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                Model Ready (HICO-DET)
              </span>
            )}
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            lineHeight: 1.15,
            margin: '0 0 16px',
            letterSpacing: '-0.02em',
          }}>
            Human-Object Interaction Detection with <span className="gradient-text-cyan">MUREN</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(14px, 1.8vw, 16px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 28px',
            maxWidth: '750px',
          }}>
            Traditional object detection only shows <em>what</em> is in an image. MUREN goes beyond to detect 
            <strong> <em>what humans are doing with objects</em></strong> in real-time, outputting structured 
            <code style={{ margin: '0 6px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--cyan-primary)' }}>
              &lt;Person, Verb, Object&gt;
            </code> 
            triplets via Relational Transformer context learning.
          </p>

          {/* Action Launch Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('photo')}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
                transition: 'all 200ms ease',
              }}
            >
              <IconImage size={18} />
              <span>Launch Photo Analysis</span>
            </button>

            <button
              onClick={() => onNavigate('webcam')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                transition: 'all 200ms ease',
              }}
            >
              <IconCamera size={18} color="#10b981" />
              <span>Real-Time Webcam</span>
            </button>

            <button
              onClick={() => onNavigate('video')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                transition: 'all 200ms ease',
              }}
            >
              <IconVideo size={18} color="#8b5cf6" />
              <span>Video Tracking</span>
            </button>

            <button
              onClick={onOpenArchitecture}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px dashed var(--border-subtle)',
                transition: 'all 200ms ease',
              }}
            >
              <IconCpu size={16} />
              <span>Architecture Specs</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== METRIC STATS STRIP ===================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            Detectable Objects
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            80 <span style={{ fontSize: '14px', color: 'var(--cyan-primary)', fontWeight: 600 }}>COCO Classes</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Persons, vehicles, sports, animals, gadgets
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            Action Verbs
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            117 <span style={{ fontSize: '14px', color: 'var(--violet-primary)', fontWeight: 600 }}>Categories</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Ride, eat, hold, carry, talk_on, throw, inspect
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            HOI Combinations
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            600 <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>Triplets</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Canonical &lt;Subject, Verb, Object&gt; pairs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            Benchmark Score
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            32.87 <span style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>mAP</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            State-of-the-Art on HICO-DET Test set
          </div>
        </div>
      </div>

      {/* ===================== 4 CORE MODULE CARDS ===================== */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>
            Interactive AI Modules
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Choose an operational mode to test the MUREN relational transformer
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '20px',
        }}>
          {/* Card 1: Single Image */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            transition: 'transform 200ms ease, box-shadow 200ms ease',
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <IconImage size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Single Image Analysis</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Upload any image or pick from benchmark tests. Inspect interactive bounding boxes, confidence score sliders, 
                and Explainable AI (XAI) cross-attention heatmaps.
              </p>
            </div>
            <button
              onClick={() => onNavigate('photo')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Explore Photo Mode</span>
              <span>→</span>
            </button>
          </div>

          {/* Card 2: Video Tracking */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <IconVideo size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Video Action Tracking</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Upload action clips or test built-in videos. Performs frame sampling, IoU spatial continuity tracking, 
                and constructs continuous Action Intervals across time.
              </p>
            </div>
            <button
              onClick={() => onNavigate('video')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Explore Video Mode</span>
              <span>→</span>
            </button>
          </div>

          {/* Card 3: Live Webcam */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <IconCamera size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Live Webcam Detection</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Real-time WebSocket streaming. Hold up bottles, phones, cups, or books to the camera to see instant 
                frame-by-frame &lt;person, action, object&gt; detection overlays.
              </p>
            </div>
            <button
              onClick={() => onNavigate('webcam')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Start Live Camera</span>
              <span>→</span>
            </button>
          </div>

          {/* Card 4: Batch Audit */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <IconFiles size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Batch Dataset Audit</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Queue multiple test photos in one click. Analyze action distributions and export formal audit 
                reports in CSV (Excel) or academic printable HTML formats.
              </p>
            </div>
            <button
              onClick={() => onNavigate('batch')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Launch Batch Audit</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== HOW IT WORKS PIPELINE ===================== */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '20px' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--cyan-primary)', fontWeight: 700, letterSpacing: '0.08em' }}>
            System Architecture
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 8px' }}>
            How MUREN Detects Interactions
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            From raw RGB pixels to semantic interaction triplets in a single end-to-end forward pass
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {/* Step 1 */}
          <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>1</span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Feature Extraction</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              ResNet-50 extracts 2048-dim feature maps from the input image, projected to 256 channels.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>2</span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Transformer Encoder</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              6 encoder layers with sine positional encoding perform global self-attention to generate image memory.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>3</span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Three-Branch Decoder</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              64 queries decode parallel Human, Object, and Action paths, cross-communicating via the MURE engine.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>4</span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>HOI Triplet Output</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Outputs filtered boxes and multi-label action probabilities: &lt;Subject, Verb, Object&gt;.
            </p>
          </div>
        </div>
      </div>

      {/* ===================== 1-CLICK QUICK SAMPLE TEST ===================== */}
      {samples.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px 32px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>
                Quick Benchmark Scenarios
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Click any scene below to immediately run MUREN inference on that sample
              </p>
            </div>
            <button
              onClick={() => onNavigate('photo')}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--cyan-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View All 8 Samples →
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}>
            {samples.slice(0, 6).map((sample, idx) => (
              <div
                key={sample.filename}
                onClick={() => {
                  onSelectSample(sample);
                  onNavigate('photo');
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  transition: 'transform 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--cyan-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <img
                  src={sample.url}
                  alt={sample.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '8px',
                }}>
                  <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>
                    Sample #{idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
