import React, { useRef } from 'react';
import type { SampleVideoItem } from '../../types/video';
import { IconUpload, IconFilm, IconSparkles, IconX } from '../Icons';

interface VideoUploadPanelProps {
  selectedFile: File | null;
  selectedSample: SampleVideoItem | null;
  onFileSelect: (file: File) => void;
  onSelectSample: (sample: SampleVideoItem) => void;
  onClear: () => void;
  samples: SampleVideoItem[];
  isProcessing: boolean;
}

export const VideoUploadPanel: React.FC<VideoUploadPanelProps> = ({
  selectedFile,
  selectedSample,
  onFileSelect,
  onSelectSample,
  onClear,
  samples,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const hasVideoSelected = selectedFile !== null || selectedSample !== null;
  const currentVideoName = selectedFile ? selectedFile.name : (selectedSample ? selectedSample.title : null);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconFilm size={18} color="#8b5cf6" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Video Input Source
          </span>
        </div>
        {hasVideoSelected && !isProcessing && (
          <button
            onClick={onClear}
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
            <span>Remove Video</span>
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        style={{
          border: hasVideoSelected ? '2px solid rgba(139, 92, 246, 0.6)' : '2px dashed rgba(148, 163, 184, 0.25)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          backgroundColor: hasVideoSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(15, 23, 42, 0.5)',
          transition: 'all 200ms ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              onFileSelect(e.target.files[0]);
            }
          }}
        />

        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'rgba(30, 41, 59, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px',
          color: '#c084fc',
        }}>
          <IconUpload size={22} />
        </div>

        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
          {currentVideoName ? currentVideoName : 'Drop a video file here or click to browse'}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Supports MP4, MOV, AVI, WEBM (Max 200MB)
        </div>
      </div>

      {/* 1-Click Benchmark Video Card */}
      {samples.length > 0 && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <IconSparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                Benchmark Test Video
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                16s multi-scene HOI sequence (Kite, Sports, Cycling)
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => onSelectSample(samples[0])}
            disabled={isProcessing}
            style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'rgba(139, 92, 246, 0.4)' }}
          >
            <span>Load Sample</span>
          </button>
        </div>
      )}
    </div>
  );
};
