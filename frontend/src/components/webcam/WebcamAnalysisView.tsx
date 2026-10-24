import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Prediction, PredictResponse } from '../../types/hoi';
import { runPredict } from '../../services/api';
import {
  IconCamera,
  IconPlay,
  IconPause,
  IconZap,
  IconCrosshair,
  IconDownload,
  IconSparkles,
  IconLayers,
  IconX,
} from '../Icons';

interface WebcamAnalysisViewProps {
  onSendToPhotoAnalysis?: (file: File) => void;
}

export const WebcamAnalysisView: React.FC<WebcamAnalysisViewProps> = ({
  onSendToPhotoAnalysis,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [activeQueryId, setActiveQueryId] = useState<number | null>(null);

  // Hyperparameters
  const [minActionScore, setMinActionScore] = useState<number>(0.20);
  const [minObjectScore, setMinObjectScore] = useState<number>(0.50);
  const [maxInteractions, setMaxInteractions] = useState<number>(5);

  // Snapshot & Analysis State
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isAnalyzingSnapshot, setIsAnalyzingSnapshot] = useState<boolean>(false);
  const [snapshotResult, setSnapshotResult] = useState<PredictResponse | null>(null);
  const [snapshotAnnotatedUrl, setSnapshotAnnotatedUrl] = useState<string | null>(null);
  const [snapshotViewMode, setSnapshotViewMode] = useState<'annotated' | 'original'>('annotated');
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // Telemetry counters
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);


  // 1. Initialize Webcam Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Could not access webcam. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
    setPredictions([]);
    setFps(0);
  };

  // 2. Connect WebSocket
  useEffect(() => {
    if (!isStreaming) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/webcam/stream`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebcamWS] Connected to inference stream');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'prediction') {
          setPredictions(msg.predictions || []);
          setLatencyMs(msg.inference_time_ms || 0);

          // Update FPS calculation
          frameCountRef.current += 1;
          const now = performance.now();
          const elapsed = (now - lastFrameTimeRef.current) / 1000;
          if (elapsed >= 1.0) {
            setFps(Math.round(frameCountRef.current / elapsed));
            frameCountRef.current = 0;
            lastFrameTimeRef.current = now;
          }
        }
      } catch (e) {
        console.warn('WS message error:', e);
      } finally {
        isProcessingRef.current = false;
      }
    };

    ws.onerror = (err) => {
      console.warn('[WebcamWS] Error:', err);
      isProcessingRef.current = false;
    };

    ws.onclose = () => {
      console.log('[WebcamWS] Disconnected');
    };

    return () => {
      ws.close();
    };
  }, [isStreaming]);

  // 3. Frame Dispatch Loop (Frame Capturing)
  useEffect(() => {
    if (!isStreaming) return;

    const intervalId = setInterval(() => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        isProcessingRef.current ||
        !videoRef.current ||
        !canvasRef.current
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = 480; // moderate resolution for optimal CPU inference speed
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 480);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      isProcessingRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'frame',
          image: dataUrl,
          min_action_score: minActionScore,
          min_object_score: minObjectScore,
          max_interactions: maxInteractions,
        })
      );
    }, 200); // 5 FPS request rate (throttle for CPU inference)

    return () => clearInterval(intervalId);
  }, [isStreaming, minActionScore, minObjectScore, maxInteractions]);

  // 4. Render Bounding Box Canvas Overlay
  const drawOverlays = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;

    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (predictions.length === 0 || video.videoWidth === 0) return;

    const scaleX = overlay.width / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;

    predictions.forEach((p) => {
      const isHovered = activeQueryId === p.query_id;
      const [hx1, hy1, hx2, hy2] = p.subject_box;
      const [ox1, oy1, ox2, oy2] = p.object_box;

      const sx1 = hx1 * scaleX;
      const sy1 = hy1 * scaleY;
      const sw = (hx2 - hx1) * scaleX;
      const sh = (hy2 - hy1) * scaleY;

      const tx1 = ox1 * scaleX;
      const ty1 = oy1 * scaleY;
      const tw = (ox2 - ox1) * scaleX;
      const th = (oy2 - oy1) * scaleY;

      // Subject Box (Cyan)
      ctx.strokeStyle = isHovered ? '#22d3ee' : 'rgba(6, 182, 212, 0.85)';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(sx1, sy1, sw, sh);

      // Object Box (Violet)
      ctx.strokeStyle = isHovered ? '#c084fc' : 'rgba(139, 92, 246, 0.85)';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(tx1, ty1, tw, th);

      // Interaction link line
      const hCenterX = sx1 + sw / 2;
      const hCenterY = sy1 + sh / 2;
      const oCenterX = tx1 + tw / 2;
      const oCenterY = ty1 + th / 2;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isHovered ? '#34d399' : 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = isHovered ? 2 : 1.5;
      ctx.moveTo(hCenterX, hCenterY);
      ctx.lineTo(oCenterX, oCenterY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label badge
      const midX = (hCenterX + oCenterX) / 2;
      const midY = (hCenterY + oCenterY) / 2;
      const label = `${p.primary_action} → ${p.object_label} (${(p.primary_action_score * 100).toFixed(0)}%)`;

      ctx.font = 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(midX - textWidth / 2 - 6, midY - 12, textWidth + 12, 20);

      ctx.fillStyle = isHovered ? '#38bdf8' : '#f8fafc';
      ctx.fillText(label, midX - textWidth / 2, midY + 2);
    });
  }, [predictions, activeQueryId]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      drawOverlays();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [drawOverlays]);

  // Helper to convert base64 DataURL to File object
  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/jpeg' });
  };

  // 1. Take Snapshot
  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.92);
      setSnapshotUrl(url);
      setSnapshotResult(null);
      setSnapshotAnnotatedUrl(null);
      setSnapshotError(null);
    }
  };

  // 2. Run In-Depth MUREN Analysis on Captured Snapshot
  const handleAnalyzeSnapshot = async () => {
    if (!snapshotUrl) return;

    try {
      setIsAnalyzingSnapshot(true);
      setSnapshotError(null);

      const file = await dataUrlToFile(snapshotUrl, 'webcam_snapshot.jpg');
      const res = await runPredict(
        file,
        'webcam_snapshot.jpg',
        minActionScore,
        minObjectScore,
        maxInteractions
      );

      setSnapshotResult(res);
      setSnapshotAnnotatedUrl(`/api/result/${res.result_id}/image`);
      setSnapshotViewMode('annotated');
    } catch (err: any) {
      setSnapshotError(err.message || 'Failed to analyze snapshot with MUREN engine');
    } finally {
      setIsAnalyzingSnapshot(false);
    }
  };

  // 3. Send Snapshot to Photo Analysis Workspace
  const handleSendToWorkspace = async () => {
    if (!snapshotUrl || !onSendToPhotoAnalysis) return;
    try {
      const file = await dataUrlToFile(snapshotUrl, 'webcam_snapshot.jpg');
      onSendToPhotoAnalysis(file);
    } catch (err: any) {
      console.error('Failed to send snapshot to photo workspace:', err);
    }
  };

  // 4. Discard Snapshot
  const handleDiscardSnapshot = () => {
    setSnapshotUrl(null);
    setSnapshotResult(null);
    setSnapshotAnnotatedUrl(null);
    setSnapshotError(null);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Banner / Controls */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
          }}>
            <IconCamera size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Real-Time Webcam Analysis</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Live WebSocket streaming with real-time HOI detection overlay & action parsing
            </p>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-emerald" style={{ fontSize: '12px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isStreaming ? '#10b981' : '#64748b',
              display: 'inline-block',
            }} />
            <span>{isStreaming ? 'Stream Active' : 'Idle'}</span>
          </div>

          {isStreaming && (
            <>
              <div className="badge badge-cyan mono-metric" style={{ fontSize: '12px' }}>
                <IconZap size={13} />
                <span>{fps} FPS</span>
              </div>
              <div className="badge badge-violet mono-metric" style={{ fontSize: '12px' }}>
                <span>Latency: {latencyMs} ms</span>
              </div>
            </>
          )}

          {/* Start/Stop Button */}
          {!isStreaming ? (
            <button className="btn btn-primary" onClick={startCamera} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <IconPlay size={16} />
              <span>Start Webcam</span>
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopCamera} style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <IconPause size={16} />
              <span>Stop Stream</span>
            </button>
          )}

          {isStreaming && (
            <button className="btn btn-secondary" onClick={handleTakeSnapshot} title="Capture current frame">
              <IconCamera size={15} />
              <span>Snapshot</span>
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '12px',
          padding: '12px 18px',
          color: '#fb7185',
          fontSize: '13px',
        }}>
          <strong>Webcam Error:</strong> {cameraError}
        </div>
      )}

      {/* Main Workspace: Feed + Detection Feed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left: Video Viewport & Canvas Overlay */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            background: 'var(--bg-deep)',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
          }}>
            {!isStreaming && (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <IconCamera size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Webcam is Off</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto 16px' }}>
                  Click "Start Webcam" above to grant camera access and begin live HOI detection.
                </p>
                <button className="btn btn-primary" onClick={startCamera}>
                  <IconPlay size={15} />
                  <span>Enable Camera</span>
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isStreaming ? 'block' : 'none',
              }}
            />

            <canvas
              ref={overlayCanvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                display: isStreaming ? 'block' : 'none',
              }}
            />

            {/* Hidden canvas used for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Quick Sliders Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '14px',
            background: 'var(--bg-surface)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Action Thresh</span>
                <span className="mono-metric" style={{ color: '#06b6d4' }}>{(minActionScore * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={minActionScore}
                onChange={(e) => setMinActionScore(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Object Thresh</span>
                <span className="mono-metric" style={{ color: '#8b5cf6' }}>{(minObjectScore * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={minObjectScore}
                onChange={(e) => setMinObjectScore(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Max Detections</span>
                <span className="mono-metric" style={{ color: '#10b981' }}>{maxInteractions}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={maxInteractions}
                onChange={(e) => setMaxInteractions(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* Right: Live Detections Feed & Snapshot Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Action Feed */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCrosshair size={16} color="var(--cyan-primary)" />
                <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 700 }}>Live HOI Detections</h3>
              </div>
              <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                {predictions.length} Active
              </span>
            </div>

            {predictions.length === 0 ? (
              <div style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '8px',
              }}>
                {isStreaming
                  ? 'No interactions detected above current threshold. Lower threshold or move in front of camera.'
                  : 'Start webcam stream to see real-time interaction detections.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {predictions.map((p) => {
                  const isHovered = activeQueryId === p.query_id;
                  return (
                    <div
                      key={p.query_id}
                      onMouseEnter={() => setActiveQueryId(p.query_id)}
                      onMouseLeave={() => setActiveQueryId(null)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: isHovered ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        border: `1px solid ${isHovered ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--cyan-primary)', fontSize: '12px', fontWeight: 600 }}>
                            {p.subject_label}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                            {p.primary_action}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                          <span style={{ color: 'var(--violet-primary)', fontSize: '12px', fontWeight: 600 }}>
                            {p.object_label}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Query #{p.query_id} • Object conf: {(p.object_score * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="mono-metric" style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                          {(p.primary_action_score * 100).toFixed(0)}%
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Action Conf</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enhanced Snapshot Analysis Panel */}
          {snapshotUrl && (
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconCamera size={16} color="var(--emerald-primary)" />
                  <h4 style={{ fontSize: '14px', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Snapshot Frame
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handleDiscardSnapshot}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#fb7185' }}
                    title="Discard snapshot"
                  >
                    <IconX size={12} />
                    <span>Discard</span>
                  </button>
                  <a
                    href={snapshotAnnotatedUrl || snapshotUrl}
                    download="webcam_hoi_snapshot.jpg"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <IconDownload size={12} />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyzeSnapshot}
                  disabled={isAnalyzingSnapshot}
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                  }}
                >
                  {isAnalyzingSnapshot ? (
                    <>
                      <span className="spin-loader">⚡</span>
                      <span>Analyzing Frame with MUREN...</span>
                    </>
                  ) : (
                    <>
                      <IconSparkles size={14} />
                      <span>{snapshotResult ? 'Re-Analyze Snapshot' : 'Analyze Snapshot with MUREN'}</span>
                    </>
                  )}
                </button>

                {onSendToPhotoAnalysis && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleSendToWorkspace}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                    title="Open snapshot in main photo analysis workspace with XAI heatmaps"
                  >
                    <IconLayers size={14} />
                    <span>Open in Photo Workspace</span>
                  </button>
                )}
              </div>

              {snapshotError && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fb7185',
                  fontSize: '12px',
                }}>
                  {snapshotError}
                </div>
              )}

              {/* View Switcher if analyzed */}
              {snapshotAnnotatedUrl && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSnapshotViewMode('annotated')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: snapshotViewMode === 'annotated' ? 'var(--cyan-primary)' : 'var(--bg-surface)',
                      color: snapshotViewMode === 'annotated' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    Annotated Detections
                  </button>
                  <button
                    onClick={() => setSnapshotViewMode('original')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: snapshotViewMode === 'original' ? 'var(--cyan-primary)' : 'var(--bg-surface)',
                      color: snapshotViewMode === 'original' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    Raw Frame
                  </button>
                </div>
              )}

              {/* Image Viewport */}
              <div style={{
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-deep)',
              }}>
                <img
                  src={snapshotViewMode === 'annotated' && snapshotAnnotatedUrl ? snapshotAnnotatedUrl : snapshotUrl}
                  alt="Webcam Snapshot"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* Detailed Breakdown if analyzed */}
              {snapshotResult && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Inference Results
                    </span>
                    <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {snapshotResult.inference_time_ms} ms • {snapshotResult.predictions.length} HOIs
                    </span>
                  </div>

                  {snapshotResult.predictions.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                      No interactions passed current confidence thresholds.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {snapshotResult.predictions.map((p, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: '6px',
                            fontSize: '11px',
                          }}
                        >
                          <div>
                            <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{p.subject_label}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.primary_action}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                            <span style={{ color: 'var(--violet-primary)', fontWeight: 600 }}>{p.object_label}</span>
                          </div>
                          <span className="mono-metric" style={{ color: 'var(--emerald-primary)', fontWeight: 700 }}>
                            {(p.primary_action_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
