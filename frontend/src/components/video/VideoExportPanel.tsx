import React, { useState } from 'react';
import type { VideoJobResultsResponse } from '../../types/video';
import { compileAnnotatedVideo } from '../../services/videoApi';
import { IconDownload, IconFilm, IconCode } from '../Icons';

interface VideoExportPanelProps {
  jobId: string | null;
  results: VideoJobResultsResponse | null;
  sampledVideoAvailable: boolean;
  annotatedVideoAvailable: boolean;
}

export const VideoExportPanel: React.FC<VideoExportPanelProps> = ({
  jobId,
  results,
  sampledVideoAvailable: _sampledVideoAvailable,
  annotatedVideoAvailable: _annotatedVideoAvailable,
}) => {
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileMessage, setCompileMessage] = useState<string | null>(null);

  if (!jobId || !results || results.frames.length === 0) return null;

  const handleDownloadSampled = () => {
    window.open(`/api/video/jobs/${jobId}/annotated-video?mode=sampled`, '_blank');
  };

  const handleCompileFullVideo = async () => {
    try {
      setIsCompiling(true);
      setCompileMessage('Compiling full-duration video with frame-hold propagation...');
      const res = await compileAnnotatedVideo(jobId, 'original');
      setCompileMessage('Compiled successfully! Starting download...');
      window.open(res.download_url, '_blank');
    } catch (err: any) {
      setCompileMessage(`Error: ${err.message || 'Compilation failed'}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownloadMarkdownReport = () => {
    let md = `# MUREN AI: Video Temporal Action Analysis Report\n\n`;
    md += `**Job ID:** \`${jobId}\`\n`;
    md += `**Total Analyzed Frames:** ${results.total_analyzed_frames}\n`;
    md += `**Total Detected Interactions:** ${results.total_detected_interactions}\n`;
    md += `**Video Duration:** ${results.video_metadata?.duration_seconds || 'N/A'}s\n\n`;
    md += `## 1. Temporal Action Intervals\n\n`;
    md += `| Action | Target Object | Start Time | End Time | Duration | Peak Conf. |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const a of results.action_intervals || []) {
      md += `| **${a.action}** | ${a.object_label} | ${a.start_timestamp}s | ${a.end_timestamp}s | ${a.duration_seconds}s | ${Math.round(a.peak_action_score * 100)}% |\n`;
    }
    md += `\n## 2. Analyzed Frame Detections\n\n`;
    for (const f of results.frames) {
      md += `### Frame #${f.frame_index} @ ${f.timestamp_seconds.toFixed(2)}s (${f.accepted_interactions_count} interactions)\n\n`;
      for (const p of f.predictions) {
        md += `- **person → ${p.primary_action} → ${p.object_label}** (Action Conf: ${Math.round(p.primary_action_score * 100)}%, Object Conf: ${Math.round(p.object_score * 100)}%)\n`;
      }
      md += `\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muren_video_report_${jobId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muren_video_analysis_${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconDownload size={18} color="#34d399" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Video & Report Export Center
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Option 1: Sampled-Frame Video */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '2px' }}>
              Policy 1: Sampled-Frame Video
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Outputs analyzed frames at 2 FPS. Lightweight, exact-frame inspection without interpolation.
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleDownloadSampled}
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            <IconFilm size={14} />
            <span>Download Sampled MP4</span>
          </button>
        </div>

        {/* Option 2: Original-Duration Video */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', marginBottom: '2px' }}>
              Policy 2: Full-Duration Video
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Maintains exact original video duration with timestamp frame-hold propagation.
            </div>
          </div>

          <button
            className="btn btn-glow-violet"
            onClick={handleCompileFullVideo}
            disabled={isCompiling}
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            {isCompiling ? (
              <>
                <span className="spin-loader">⭮</span>
                <span>Compiling Video...</span>
              </>
            ) : (
              <>
                <IconFilm size={14} />
                <span>Compile Full-Duration MP4</span>
              </>
            )}
          </button>
        </div>

        {/* Option 3: Academic Research Report */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', marginBottom: '2px' }}>
              Academic Research Report
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Exports publication-ready Markdown audit report with temporal action continuity intervals and frame breakdowns.
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleDownloadMarkdownReport}
            style={{ padding: '8px 12px', fontSize: '12px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            <span>📄 Export Research Report (.md)</span>
          </button>
        </div>

        {/* Option 4: JSON Analysis Data */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', marginBottom: '2px' }}>
              JSON Analysis Report
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Exports all {results.total_analyzed_frames} frames, timestamps, bounding boxes, and action rankings.
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleDownloadJson}
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            <IconCode size={14} />
            <span>Download JSON Data</span>
          </button>
        </div>
      </div>

      {compileMessage && (
        <div style={{ fontSize: '11px', color: '#38bdf8', padding: '6px 10px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '6px' }}>
          {compileMessage}
        </div>
      )}
    </div>
  );
};
