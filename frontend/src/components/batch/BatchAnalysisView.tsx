import React, { useState, useRef } from 'react';
import {
  IconFiles,
  IconUpload,
  IconDownload,
  IconFileText,
  IconX,
  IconSliders,
  IconSparkles,
  IconEye,
} from '../Icons';

interface BatchItem {
  index: number;
  filename: string;
  status: 'completed' | 'failed' | 'skipped' | 'processing' | 'pending';
  result_id?: string;
  thumbnail_url?: string;
  annotated_url?: string;
  inference_time_ms?: number;
  interaction_count: number;
  predictions: any[];
  error?: string;
}

interface BatchSummary {
  batch_id: string;
  total_images: number;
  successful_images: number;
  total_interactions_detected: number;
  avg_inference_time_ms: number;
  items: BatchItem[];
}

export const BatchAnalysisView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files & Queue
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hyperparameters
  const [minActionScore, setMinActionScore] = useState<number>(0.20);
  const [minObjectScore, setMinObjectScore] = useState<number>(0.50);
  const [maxInteractions, setMaxInteractions] = useState<number>(5);

  // Modal inspection of an annotated image
  const [inspectImageUrl, setInspectImageUrl] = useState<string | null>(null);

  // Handle file addition
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray].slice(0, 30));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      setSelectedFiles((prev) => [...prev, ...filesArray].slice(0, 30));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setSelectedFiles([]);
    setBatchSummary(null);
    setErrorMessage(null);
  };

  // Run Batch Processing
  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('min_action_score', minActionScore.toString());
      formData.append('min_object_score', minObjectScore.toString());
      formData.append('max_interactions', maxInteractions.toString());

      const res = await fetch('/api/batch/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errStr = `Batch analysis failed (${res.status})`;
        try {
          const errData = await res.json();
          if (errData.detail) errStr = errData.detail;
        } catch {
          // ignore
        }
        throw new Error(errStr);
      }

      const data: BatchSummary = await res.json();
      setBatchSummary(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Batch execution encountered an error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
          }}>
            <IconFiles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Batch Image Processing</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Queue multi-image datasets, detect interactions in parallel, and export CSV/PDF reports
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {selectedFiles.length > 0 && !isProcessing && (
            <button className="btn btn-secondary" onClick={clearQueue} style={{ fontSize: '13px' }}>
              <span>Clear Queue ({selectedFiles.length})</span>
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleStartBatch}
            disabled={selectedFiles.length === 0 || isProcessing}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            {isProcessing ? (
              <>
                <span className="spin-loader">⚡</span>
                <span>Processing {selectedFiles.length} Images...</span>
              </>
            ) : (
              <>
                <IconSparkles size={16} />
                <span>Run Batch Analysis ({selectedFiles.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '12px',
          padding: '12px 18px',
          color: '#fb7185',
          fontSize: '13px',
        }}>
          <strong>Batch Error:</strong> {errorMessage}
        </div>
      )}

      {/* Main Grid: Upload & Controls on Left, Results on Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left Column: Dropzone & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dropzone */}
          <div
            className="glass-panel"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '2px dashed var(--border-subtle)',
              borderRadius: '14px',
              cursor: 'pointer',
              transition: 'border-color 150ms ease',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <IconUpload size={22} />
            </div>
            <h4 style={{ fontSize: '14px', margin: '0 0 6px', fontWeight: 600 }}>
              Drop images here or browse
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Supports JPG, PNG, WEBP (up to 30 images)
            </p>
          </div>

          {/* Hyperparameters Card */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <IconSliders size={15} color="var(--amber-primary)" />
              <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>Inference Thresholds</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Min Action Score</span>
                  <span className="mono-metric" style={{ color: '#f59e0b', fontWeight: 600 }}>{(minActionScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.90"
                  step="0.05"
                  value={minActionScore}
                  onChange={(e) => setMinActionScore(parseFloat(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Min Object Score</span>
                  <span className="mono-metric" style={{ color: '#8b5cf6', fontWeight: 600 }}>{(minObjectScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={minObjectScore}
                  onChange={(e) => setMinObjectScore(parseFloat(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Max HOIs per Image</span>
                  <span className="mono-metric" style={{ color: '#10b981', fontWeight: 600 }}>{maxInteractions}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={maxInteractions}
                  onChange={(e) => setMaxInteractions(parseInt(e.target.value, 10))}
                />
              </div>
            </div>
          </div>

          {/* Selected Files Queue Preview */}
          {selectedFiles.length > 0 && (
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>
                  Queue ({selectedFiles.length})
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--bg-surface)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Batch Results & Export Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {batchSummary && (
            <div className="glass-panel" style={{ padding: '18px 20px', background: 'var(--bg-surface-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', margin: '0 0 4px', fontWeight: 700 }}>
                    Batch Analysis Completed ✓
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Batch ID: <code style={{ color: 'var(--cyan-primary)' }}>{batchSummary.batch_id}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href={`/api/batch/${batchSummary.batch_id}/csv`}
                    download={`muren_batch_${batchSummary.batch_id}.csv`}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    <IconDownload size={14} />
                    <span>Download CSV</span>
                  </a>

                  <a
                    href={`/api/batch/${batchSummary.batch_id}/report`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', background: 'linear-gradient(135deg, #06b6d4, #2563eb)' }}
                  >
                    <IconFileText size={14} />
                    <span>View / Print Report</span>
                  </a>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
              }}>
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Total Processed</div>
                  <div className="mono-metric" style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                    {batchSummary.successful_images} / {batchSummary.total_images}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Total HOI Detections</div>
                  <div className="mono-metric" style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                    {batchSummary.total_interactions_detected}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Average Latency</div>
                  <div className="mono-metric" style={{ fontSize: '18px', fontWeight: 700, color: '#06b6d4' }}>
                    {batchSummary.avg_inference_time_ms} ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Gallery Grid */}
          {batchSummary ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              {batchSummary.items.map((item) => (
                <div
                  key={item.index}
                  className="glass-panel"
                  style={{
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '140px',
                    background: 'var(--bg-deep)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {item.annotated_url ? (
                      <img
                        src={item.annotated_url}
                        alt={item.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No Preview</div>
                    )}

                    {item.annotated_url && (
                      <button
                        onClick={() => setInspectImageUrl(item.annotated_url!)}
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                        }}
                      >
                        <IconEye size={12} />
                        <span>Inspect</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </span>
                      <span className={`badge ${item.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{item.interaction_count} HOIs found</span>
                      <span className="mono-metric">{item.inference_time_ms ? `${item.inference_time_ms} ms` : '-'}</span>
                    </div>

                    {/* Top action pills */}
                    {item.predictions && item.predictions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {item.predictions.slice(0, 2).map((pred: any, i: number) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '10px',
                              background: 'rgba(6, 182, 212, 0.12)',
                              color: 'var(--cyan-primary)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {pred.primary_action} {pred.object_label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <IconFiles size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '6px' }}>No Batch Run Yet</h3>
              <p style={{ fontSize: '13px', margin: 0, maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
                Upload images on the left and click "Run Batch Analysis" to inspect multiple images simultaneously.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Image Modal */}
      {inspectImageUrl && (
        <div
          onClick={() => setInspectImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              padding: '12px',
            }}
          >
            <button
              onClick={() => setInspectImageUrl(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <IconX size={18} />
            </button>
            <img
              src={inspectImageUrl}
              alt="Annotated Inspection"
              style={{ maxWidth: '85vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
