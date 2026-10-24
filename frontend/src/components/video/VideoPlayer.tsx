import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { FrameAnalysisResult } from '../../types/video';
import { IconPlay, IconPause, IconClock, IconSparkles } from '../Icons';

interface VideoPlayerProps {
  videoSrc: string | null;
  analyzedFrames: FrameAnalysisResult[];
  selectedFrameId: string | null;
  onSelectFrame: (frame: FrameAnalysisResult) => void;
  seekTimestamp: number | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoSrc,
  analyzedFrames,
  selectedFrameId,
  onSelectFrame,
  seekTimestamp,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync external seek requests (e.g. user clicked a frame card)
  useEffect(() => {
    if (seekTimestamp !== null && videoRef.current) {
      videoRef.current.currentTime = seekTimestamp;
      videoRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(seekTimestamp);
    }
  }, [seekTimestamp]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Natural Language Action Search Filter
  const matchingFrames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return analyzedFrames.filter(frame => {
      return frame.predictions.some(pred => {
        const actionMatch = pred.primary_action.toLowerCase().includes(query);
        const objectMatch = pred.object_label.toLowerCase().includes(query);
        const topActionsMatch = pred.top3_actions.some(a => a.verb_name.toLowerCase().includes(query));
        return actionMatch || objectMatch || topActionsMatch;
      });
    });
  }, [analyzedFrames, searchQuery]);

  // Jump to Next / Prev search match
  const handleJumpMatch = (direction: 'next' | 'prev') => {
    if (matchingFrames.length === 0) return;

    if (direction === 'next') {
      const next = matchingFrames.find(f => f.timestamp_seconds > currentTime + 0.1);
      const target = next || matchingFrames[0];
      onSelectFrame(target);
    } else {
      const reversed = [...matchingFrames].reverse();
      const prev = reversed.find(f => f.timestamp_seconds < currentTime - 0.1);
      const target = prev || matchingFrames[matchingFrames.length - 1];
      onSelectFrame(target);
    }
  };

  if (!videoSrc) {
    return (
      <div className="glass-panel" style={{
        height: '340px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'rgba(139, 92, 246, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          color: 'var(--violet-primary)',
        }}>
          <IconClock size={28} />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Original Video Synchronizer
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
          Upload or select a video to preview the source footage alongside interactive temporal interaction markers.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Search & Action Filter Bar */}
      {analyzedFrames.length > 0 && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.75)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <IconSparkles size={16} color="#38bdf8" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search action or object in video (e.g. 'ride', 'horse', 'tennis', 'hold')..."
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {searchQuery && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: matchingFrames.length > 0 ? '#34d399' : '#fb7185', fontWeight: 600 }}>
                {matchingFrames.length} {matchingFrames.length === 1 ? 'frame match' : 'frame matches'}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => handleJumpMatch('prev')}
                disabled={matchingFrames.length === 0}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                ◀ Prev
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleJumpMatch('next')}
                disabled={matchingFrames.length === 0}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video Viewport */}
      <div style={{ position: 'relative', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          style={{
            maxHeight: '380px',
            width: '100%',
            objectFit: 'contain',
            cursor: 'pointer',
            display: 'block',
          }}
        />

        {/* Center Play Overlay Icon when paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            style={{
              position: 'absolute',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '2px solid rgba(139, 92, 246, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)',
              transition: 'transform 150ms ease',
            }}
          >
            <IconPlay size={24} style={{ marginLeft: '4px' }} />
          </div>
        )}
      </div>

      {/* Synchronized Timeline Bar with Analyzed Frame Markers */}
      <div style={{ padding: '14px 18px', background: 'rgba(10, 15, 29, 0.8)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
          {/* Native Range Scrubber */}
          <input
            type="range"
            min="0"
            max={duration > 0 ? duration : 100}
            step="0.05"
            value={currentTime}
            onChange={handleScrubberChange}
            style={{ width: '100%', zIndex: 2, accentColor: '#8b5cf6' }}
          />

          {/* Timeline Analyzed Frame Markers */}
          {duration > 0 && analyzedFrames.map(f => {
            const leftPct = (f.timestamp_seconds / duration) * 100;
            const isSelected = selectedFrameId === f.frame_id;
            const hasInteractions = f.accepted_interactions_count > 0;
            const isMatch = matchingFrames.some(m => m.frame_id === f.frame_id);

            let markerBg = hasInteractions ? '#8b5cf6' : '#64748b';
            let markerBorder = '1px solid rgba(255, 255, 255, 0.4)';
            let markerShadow = 'none';
            let markerSize = '8px';

            if (isSelected) {
              markerBg = '#06b6d4';
              markerBorder = '2px solid #ffffff';
              markerShadow = '0 0 10px #06b6d4';
              markerSize = '12px';
            } else if (isMatch) {
              markerBg = '#f59e0b';
              markerBorder = '2px solid #fef3c7';
              markerShadow = '0 0 12px #f59e0b';
              markerSize = '11px';
            }

            return (
              <div
                key={`marker-${f.frame_id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFrame(f);
                }}
                title={`Frame at ${f.timestamp_seconds.toFixed(2)}s (${f.accepted_interactions_count} interactions)${isMatch ? ' - [SEARCH MATCH]' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: markerSize,
                  height: markerSize,
                  borderRadius: '50%',
                  backgroundColor: markerBg,
                  border: markerBorder,
                  boxShadow: markerShadow,
                  cursor: 'pointer',
                  zIndex: isSelected ? 5 : (isMatch ? 4 : 3),
                  transition: 'all 150ms ease',
                }}
              />
            );
          })}
        </div>

        {/* Player Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={togglePlay}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <span className="mono-metric" style={{ color: '#38bdf8', fontWeight: 600 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {searchQuery && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Search Match
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} /> Analyzed HOI Marker
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} /> Selected Frame
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
