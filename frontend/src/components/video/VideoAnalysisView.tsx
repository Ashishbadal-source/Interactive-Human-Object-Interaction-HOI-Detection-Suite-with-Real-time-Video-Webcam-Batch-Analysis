import React, { useState, useEffect, useRef } from 'react';
import type {
  SampleVideoItem,
  VideoJobStatus,
  VideoJobResultsResponse,
  FrameAnalysisResult,
} from '../../types/video';
import {
  fetchVideoSamples,
  createVideoJob,
  pollVideoJob,
  fetchVideoResults,
  cancelVideoJob,
} from '../../services/videoApi';
import { VideoUploadPanel } from './VideoUploadPanel';
import { VideoPlayer } from './VideoPlayer';
import { VideoSamplingSettings } from './VideoSamplingSettings';
import { VideoProcessingProgress } from './VideoProcessingProgress';
import { FrameGallery } from './FrameGallery';
import { FrameDetailPanel } from './FrameDetailPanel';
import { TemporalActionIntervals } from './TemporalActionIntervals';
import { VideoExportPanel } from './VideoExportPanel';
import { IconFilm, IconCpu, IconClock, IconX } from '../Icons';

export const VideoAnalysisView: React.FC = () => {
  // Input Selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleVideoItem | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleVideoItem[]>([]);

  // Hyperparameters
  const [samplingMode, setSamplingMode] = useState<string>('interval');
  const [samplingInterval, setSamplingInterval] = useState<number>(1.0);
  const [maxFrames, setMaxFrames] = useState<number>(60);
  const [manualTimestamps, setManualTimestamps] = useState<string>('');
  const [minActionScore, setMinActionScore] = useState<number>(0.20);
  const [minObjectScore, setMinObjectScore] = useState<number>(0.50);
  const [maxInteractions, setMaxInteractions] = useState<number>(5);

  // Job & Results State
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<VideoJobStatus | null>(null);
  const [jobResults, setJobResults] = useState<VideoJobResultsResponse | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameAnalysisResult | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);

  // UI state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // Load video samples on mount
  useEffect(() => {
    async function loadSamples() {
      try {
        const s = await fetchVideoSamples();
        setSamples(s);
      } catch (err) {
        console.warn('Failed to load video samples:', err);
      }
    }
    loadSamples();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Handle local video upload
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedSample(null);
    setErrorMessage(null);
    setJobResults(null);
    setSelectedFrame(null);
    setCurrentJobId(null);
    setJobStatus(null);

    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
  };

  // Handle benchmark sample pick
  const handleSelectSample = (sample: SampleVideoItem) => {
    setSelectedSample(sample);
    setSelectedFile(null);
    setErrorMessage(null);
    setJobResults(null);
    setSelectedFrame(null);
    setCurrentJobId(null);
    setJobStatus(null);
    setVideoSrc(sample.url);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setSelectedSample(null);
    setVideoSrc(null);
    setJobResults(null);
    setSelectedFrame(null);
    setCurrentJobId(null);
    setJobStatus(null);
    setErrorMessage(null);
  };

  // Start Analysis Job
  const handleStartAnalysis = async () => {
    if (!selectedFile && !selectedSample) {
      setErrorMessage('Please select or upload a video first.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setJobResults(null);
      setSelectedFrame(null);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('video', selectedFile);
      } else if (selectedSample) {
        formData.append('sample_filename', selectedSample.filename);
      }

      formData.append('sampling_mode', samplingMode);
      formData.append('sampling_interval', samplingInterval.toString());
      formData.append('max_frames', maxFrames.toString());
      if (manualTimestamps.trim()) {
        formData.append('manual_timestamps', manualTimestamps.trim());
      }
      formData.append('min_action_score', minActionScore.toString());
      formData.append('min_object_score', minObjectScore.toString());
      formData.append('max_interactions', maxInteractions.toString());

      const initialStatus = await createVideoJob(formData);
      setCurrentJobId(initialStatus.job_id);
      setJobStatus(initialStatus);

      // Start polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const currentStatus = await pollVideoJob(initialStatus.job_id);
          setJobStatus(currentStatus);

          if (currentStatus.status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsProcessing(false);

            // Fetch final frame results
            const results = await fetchVideoResults(initialStatus.job_id);
            setJobResults(results);

            // Auto-select first frame with detections if available, else first frame
            if (results.frames && results.frames.length > 0) {
              const withDetections = results.frames.find(f => f.accepted_interactions_count > 0);
              setSelectedFrame(withDetections || results.frames[0]);
            }
          } else if (currentStatus.status === 'failed' || currentStatus.status === 'cancelled') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            if (currentStatus.error) {
              setErrorMessage(currentStatus.error);
            }
          }
        } catch (pollErr: any) {
          console.warn('Polling error:', pollErr);
        }
      }, 1000);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to initialize video job.');
    }
  };

  const handleCancelJob = async () => {
    if (currentJobId) {
      await cancelVideoJob(currentJobId);
      setIsProcessing(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setJobStatus(prev => prev ? { ...prev, status: 'cancelled', message: 'Cancelled by user' } : null);
    }
  };

  const handleSelectFrame = (frame: FrameAnalysisResult) => {
    setSelectedFrame(frame);
    setSeekTimestamp(frame.timestamp_seconds);
  };

  const videoDuration = jobStatus?.video_metadata?.duration_seconds || (selectedSample ? selectedSample.duration_seconds : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub-Header Banner */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <IconFilm size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>
              Video Analysis Studio
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Analyze temporal Human-Object Interactions across video sequences with MUREN.
            </p>
          </div>
        </div>

        {/* Telemetry info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="badge badge-violet" style={{ fontSize: '12px' }}>
            <IconCpu size={14} />
            <span>MUREN Engine (CPU Safe)</span>
          </div>
          {jobStatus?.video_metadata && (
            <div className="badge badge-cyan" style={{ fontSize: '12px' }}>
              <IconClock size={14} />
              <span>{jobStatus.video_metadata.duration_seconds}s • {jobStatus.video_metadata.fps} FPS</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fb7185',
          fontSize: '13px',
        }}>
          <span><strong>Error:</strong> {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '4px' }}
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left Column: Upload, Sampling Controls & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <VideoUploadPanel
            selectedFile={selectedFile}
            selectedSample={selectedSample}
            onFileSelect={handleFileSelect}
            onSelectSample={handleSelectSample}
            onClear={handleClear}
            samples={samples}
            isProcessing={isProcessing}
          />

          <VideoSamplingSettings
            samplingMode={samplingMode}
            setSamplingMode={setSamplingMode}
            samplingInterval={samplingInterval}
            setSamplingInterval={setSamplingInterval}
            maxFrames={maxFrames}
            setMaxFrames={setMaxFrames}
            manualTimestamps={manualTimestamps}
            setManualTimestamps={setManualTimestamps}
            minActionScore={minActionScore}
            setMinActionScore={setMinActionScore}
            minObjectScore={minObjectScore}
            setMinObjectScore={setMinObjectScore}
            maxInteractions={maxInteractions}
            setMaxInteractions={setMaxInteractions}
            videoDuration={videoDuration}
            isProcessing={isProcessing}
            onStartAnalysis={handleStartAnalysis}
            hasVideo={videoSrc !== null}
          />

          {/* Processing Progress Card */}
          <VideoProcessingProgress
            status={jobStatus}
            onCancel={handleCancelJob}
          />
        </div>

        {/* Right Column: Player, Gallery, Inspector & Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Synchronized HTML5 Video Player */}
          <VideoPlayer
            videoSrc={videoSrc}
            analyzedFrames={jobResults?.frames || []}
            selectedFrameId={selectedFrame?.frame_id || null}
            onSelectFrame={handleSelectFrame}
            seekTimestamp={seekTimestamp}
          />

          {/* Analyzed Frame Gallery */}
          {jobResults && jobResults.frames.length > 0 && (
            <FrameGallery
              frames={jobResults.frames}
              selectedFrameId={selectedFrame?.frame_id || null}
              onSelectFrame={handleSelectFrame}
            />
          )}

          {/* Temporal Action Intervals */}
          {jobResults && jobResults.action_intervals && jobResults.action_intervals.length > 0 && (
            <TemporalActionIntervals
              intervals={jobResults.action_intervals}
              videoDuration={videoDuration}
              onSeek={(ts) => {
                setSeekTimestamp(ts);
                const matching = jobResults.frames.find(f => Math.abs(f.timestamp_seconds - ts) < 0.5);
                if (matching) setSelectedFrame(matching);
              }}
            />
          )}

          {/* Selected Frame Detail Panel */}
          {selectedFrame && (
            <FrameDetailPanel
              selectedFrame={selectedFrame}
            />
          )}

          {/* Export Panel */}
          {jobResults && (
            <VideoExportPanel
              jobId={currentJobId}
              results={jobResults}
              sampledVideoAvailable={jobStatus?.sampled_video_available || false}
              annotatedVideoAvailable={jobStatus?.annotated_video_available || false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
