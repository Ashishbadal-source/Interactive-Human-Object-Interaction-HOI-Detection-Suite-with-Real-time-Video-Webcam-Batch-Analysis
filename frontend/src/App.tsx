import React, { useState, useEffect, useCallback } from 'react';
import type { HealthResponse, ModelInfoResponse, PredictResponse, Prediction, SampleImage } from './types/hoi';
import { fetchHealth, fetchModelInfo, fetchSamples, runPredict } from './services/api';
import { Header, type AppTab } from './components/Header';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { ControlPanel } from './components/ControlPanel';
import { PredictionList } from './components/PredictionList';
import { SampleSelector } from './components/SampleSelector';
import { ModelModal } from './components/ModelModal';
import { JsonModal } from './components/JsonModal';
import { VideoAnalysisView } from './components/video/VideoAnalysisView';
import { WebcamAnalysisView } from './components/webcam/WebcamAnalysisView';
import { BatchAnalysisView } from './components/batch/BatchAnalysisView';
import { IconX } from './components/Icons';

export const App: React.FC = () => {
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('muren-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('muren-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppTab>('photo');


  // Server state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [samples, setSamples] = useState<SampleImage[]>([]);

  // Selection & Inference state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedSampleName, setSelectedSampleName] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);

  // Hyperparameters
  const [minActionScore, setMinActionScore] = useState<number>(0.20);
  const [minObjectScore, setMinObjectScore] = useState<number>(0.50);
  const [maxInteractions, setMaxInteractions] = useState<number>(5);

  // Results
  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  // UI status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeQueryId, setActiveQueryId] = useState<number | null>(null);

  // Modals
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [isJsonOpen, setIsJsonOpen] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const h = await fetchHealth();
        setHealth(h);
      } catch (err) {
        console.warn('Backend not responding yet:', err);
      }

      try {
        const info = await fetchModelInfo();
        setModelInfo(info);
      } catch (err) {
        console.warn('Model info not loaded yet:', err);
      }

      try {
        const s = await fetchSamples();
        setSamples(s);
      } catch (err) {
        console.warn('Samples fetch failed:', err);
      }
    }
    init();
  }, []);

  // Handle local file upload
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedSampleName(null);
    setErrorMessage(null);

    const objectUrl = URL.createObjectURL(file);
    setOriginalImageUrl(objectUrl);
    setAnnotatedImageUrl(null);
    setPredictResult(null);
    setPredictions([]);

    // Read dimensions
    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
    };
    img.src = objectUrl;
  };

  // Handle benchmark sample pick
  const handleSelectSample = async (sample: SampleImage) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSelectedSampleName(sample.filename);
      setSelectedFileName(sample.filename);

      // Fetch sample blob
      const res = await fetch(sample.url);
      if (!res.ok) throw new Error(`Could not load sample image ${sample.filename}`);
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: 'image/jpeg' });
      setSelectedFile(file);

      const previewUrl = URL.createObjectURL(blob);
      setOriginalImageUrl(previewUrl);

      // Read dimensions
      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
      };
      img.src = previewUrl;

      // Run inference immediately on sample selection
      const result = await runPredict(file, sample.filename, minActionScore, minObjectScore, maxInteractions);
      setPredictResult(result);
      setPredictions(result.predictions);
      setAnnotatedImageUrl(`/api/result/${result.result_id}/image`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to run inference on sample image');
    } finally {
      setIsLoading(false);
    }
  };

  // Run Inference on current image
  const handleRunInference = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await runPredict(
        selectedFile,
        selectedFileName || 'image.jpg',
        minActionScore,
        minObjectScore,
        maxInteractions
      );

      setPredictResult(result);
      setPredictions(result.predictions);
      setOriginalWidth(result.original_width);
      setOriginalHeight(result.original_height);
      setAnnotatedImageUrl(`/api/result/${result.result_id}/image`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Inference execution failed');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, selectedFileName, minActionScore, minObjectScore, maxInteractions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* Navigation Header */}
      <Header
        health={health}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        padding: '0 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Error Notification Alert */}
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

        {/* Tab 1: Photo Analysis (Protected Original Feature) */}
        {activeTab === 'photo' && (
          <>
            {/* 1-Click Benchmark Test Gallery */}
            <SampleSelector
              samples={samples}
              selectedSample={selectedSampleName}
              onSelectSample={handleSelectSample}
              isLoading={isLoading}
            />

            {/* Dual Pane Workspace */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
              gap: '20px',
              alignItems: 'start',
            }}>
              {/* Left Column: Controls & Interactions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ControlPanel
                  onFileSelect={handleFileSelect}
                  selectedFileName={selectedFileName}
                  minActionScore={minActionScore}
                  setMinActionScore={setMinActionScore}
                  minObjectScore={minObjectScore}
                  setMinObjectScore={setMinObjectScore}
                  maxInteractions={maxInteractions}
                  setMaxInteractions={setMaxInteractions}
                  isLoading={isLoading}
                  onRunInference={handleRunInference}
                  inferenceTimeMs={predictResult ? predictResult.inference_time_ms : null}
                  totalCandidates={predictResult ? predictResult.total_candidates : null}
                />

                <PredictionList
                  predictions={predictions}
                  activeQueryId={activeQueryId}
                  onHoverPrediction={setActiveQueryId}
                />
              </div>

              {/* Right Column: Visualizer Canvas */}
              <div>
                <InteractiveCanvas
                  originalImageUrl={originalImageUrl}
                  annotatedImageUrl={annotatedImageUrl}
                  predictions={predictions}
                  originalWidth={originalWidth}
                  originalHeight={originalHeight}
                  activeQueryId={activeQueryId}
                  onHoverPrediction={setActiveQueryId}
                  onOpenJson={() => setIsJsonOpen(true)}
                />
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Video Analysis */}
        {activeTab === 'video' && <VideoAnalysisView />}

        {/* Tab 3: Live Real-Time Webcam Analysis */}
        {activeTab === 'webcam' && (
          <WebcamAnalysisView
            onSendToPhotoAnalysis={(file) => {
              handleFileSelect(file);
              setActiveTab('photo');
            }}
          />
        )}

        {/* Tab 4: Batch Dataset Queue & Report Export */}
        {activeTab === 'batch' && <BatchAnalysisView />}
      </main>


      {/* Architecture Spec Modal */}
      <ModelModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
        modelInfo={modelInfo}
      />

      {/* JSON Payload Inspector Modal */}
      <JsonModal
        isOpen={isJsonOpen}
        onClose={() => setIsJsonOpen(false)}
        data={predictResult}
      />
    </div>
  );
};

export default App;
