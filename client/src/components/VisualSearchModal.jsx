import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, SwitchCamera, ShieldCheck, ScanSearch, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import Modal from './ui/Modal';
import { UIContext } from '../context/UIContext';
import { CatalogContext } from '../context/CatalogContext';
import { analyzeImage, fileToDataUrl, loadModel } from '../utils/visualSearch';
import { setVisualSearchImage } from '../utils/storage';
import { COLOR_SWATCHES } from '../utils/format';

const hasCameraApi = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const VisualSearchBody = ({ onClose }) => {
  const [step, setStep] = useState('choose'); // choose | camera | analyzing | result
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [dragOver, setDragOver] = useState(false);
  const [modelNote, setModelNote] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const galleryInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const navigate = useNavigate();
  const { categories } = useContext(CatalogContext);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Start downloading the recognition model as soon as the dialog opens
  useEffect(() => { loadModel().catch(() => {}); }, []);

  const startCamera = async (mode = facingMode) => {
    setCameraError('');
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setStep('camera');
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access in your browser settings, or upload a photo instead.'
          : err.name === 'NotFoundError'
            ? 'No camera was found on this device. You can upload a photo instead.'
            : 'Could not start the camera. You can upload a photo instead.'
      );
      setStep('choose');
    }
  };

  const analyse = async (dataUrl) => {
    stopCamera();
    setImage(dataUrl);
    setStep('analyzing');
    const slowTimer = setTimeout(() => setModelNote('Downloading the recognition model (first time only)…'), 2500);
    try {
      const img = await loadImage(dataUrl);
      const result = await analyzeImage(img);
      setAnalysis(result);
      setSelectedSub(result.matches[0]?.subcategory || null);
      setSelectedColor(result.colors[0]?.name || null);
      setStep('result');
    } finally {
      clearTimeout(slowTimer);
      setModelNote('');
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setCameraError('Please choose an image file.'); return; }
    try {
      analyse(await fileToDataUrl(file));
    } catch (err) {
      setCameraError(err.message);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const max = 640;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    analyse(canvas.toDataURL('image/jpeg', 0.85));
  };

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const showResults = () => {
    const params = new URLSearchParams({ visual: '1' });
    if (selectedSub) params.set('subcategory', selectedSub);
    if (selectedColor) params.set(selectedSub ? 'boostColor' : 'color', selectedColor);
    setVisualSearchImage(image);
    try {
      sessionStorage.setItem('visualSearchResult', JSON.stringify({ matches: analysis.matches, colors: analysis.colors }));
    } catch { /* optional */ }
    onClose();
    navigate(`/products?${params.toString()}`);
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setStep('choose');
  };

  const allSubcategories = [...new Set(categories.flatMap(c => c.subcategories.map(s => s.name)))].sort();

  return (
    <div className="p-5 sm:p-6">
      {/* Hidden pickers: gallery, and native camera capture as a fallback on phones */}
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={captureInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />

      {step === 'choose' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`rounded-3xl border-2 border-dashed p-6 text-center transition ${dragOver ? 'border-accent bg-accent-soft' : 'border-line-strong'}`}
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-on-accent"><ScanSearch size={26} /></span>
            <p className="mt-4 font-display text-xl font-semibold">Find it with a photo</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Snap something you like or pick a picture from your gallery. We'll recognise the item and its colour and show similar products.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => (hasCameraApi ? startCamera() : captureInputRef.current.click())} className="btn-primary">
                <Camera size={18} /> Take a photo
              </button>
              <button onClick={() => galleryInputRef.current.click()} className="btn-outline">
                <ImagePlus size={18} /> Upload from gallery
              </button>
            </div>
            <p className="mt-4 hidden text-xs text-muted sm:block">or drag and drop an image here</p>
          </div>
          {cameraError && (
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-text" role="alert">{cameraError}</p>
          )}
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck size={16} className="shrink-0 text-success" />
            Your photo is analysed on your device and is never uploaded to our servers.
          </p>
        </div>
      )}

      {step === 'camera' && (
        <div>
          <div className="relative overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className={`aspect-[3/4] w-full object-cover sm:aspect-[4/3] ${facingMode === 'user' ? '-scale-x-100' : ''}`} aria-label="Camera preview" />
            {/* Framing guide */}
            <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-white/70" aria-hidden="true" />
            <p className="absolute inset-x-0 top-4 text-center text-sm font-bold text-white drop-shadow">Fit the item inside the frame</p>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => { stopCamera(); setStep('choose'); }} className="btn-ghost">Cancel</button>
            <button onClick={capture} className="grid h-16 w-16 place-items-center rounded-full border-4 border-accent bg-surface transition hover:scale-105" aria-label="Capture photo">
              <span className="h-11 w-11 rounded-full bg-accent" />
            </button>
            <button onClick={switchCamera} className="btn-ghost" aria-label="Switch camera"><SwitchCamera size={20} /></button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="text-center">
          <div className="relative mx-auto max-w-xs overflow-hidden rounded-3xl">
            <img src={image} alt="Your photo" className="w-full" />
            <div className="absolute inset-x-0 h-1/3 animate-pulse bg-gradient-to-b from-transparent via-accent/40 to-transparent" style={{ animation: 'scan 1.6s ease-in-out infinite' }} aria-hidden="true" />
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 font-bold"><Sparkles size={18} className="text-accent-text" /> Recognising your item…</p>
          {modelNote && <p className="mt-1 text-sm text-muted">{modelNote}</p>}
          <style>{'@keyframes scan{0%{top:-33%}100%{top:100%}}'}</style>
        </div>
      )}

      {step === 'result' && analysis && (
        <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
          <img src={image} alt="Your photo" className="mx-auto w-40 rounded-2xl object-cover sm:w-full" />
          <div className="space-y-5">
            <div>
              <p className="label">{analysis.matches.length ? 'Looks like' : 'What is it?'}</p>
              {analysis.matches.length === 0 && (
                <p className="mb-2 text-sm text-muted">
                  {analysis.modelError ? 'Item recognition is unavailable right now, so pick a category:' : "We couldn't recognise the item. Pick a category:"}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(analysis.matches.length ? analysis.matches.map(m => m.subcategory) : allSubcategories).map(sub => (
                  <button key={sub} onClick={() => setSelectedSub(selectedSub === sub ? null : sub)} className={`chip ${selectedSub === sub ? 'chip-active' : ''}`} aria-pressed={selectedSub === sub}>
                    {sub}
                  </button>
                ))}
              </div>
            </div>
            {analysis.colors.length > 0 && (
              <div>
                <p className="label">Main colour</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.colors.map(({ name }) => (
                    <button key={name} onClick={() => setSelectedColor(selectedColor === name ? null : name)} className={`chip ${selectedColor === name ? 'chip-active' : ''}`} aria-pressed={selectedColor === name}>
                      <span className="h-4 w-4 rounded-full border border-line-strong" style={{ background: COLOR_SWATCHES[name] }} aria-hidden="true" />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={showResults} disabled={!selectedSub && !selectedColor} className="btn-primary flex-1">
                Show similar products <ArrowRight size={16} />
              </button>
              <button onClick={reset} className="btn-outline"><RotateCcw size={16} /> Try another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VisualSearchModal = () => {
  const { visualSearchOpen, closeVisualSearch } = useContext(UIContext);
  return (
    <Modal open={visualSearchOpen} onClose={closeVisualSearch} title="Search with a photo" variant="wide" className="max-w-2xl">
      {visualSearchOpen && <VisualSearchBody onClose={closeVisualSearch} />}
    </Modal>
  );
};

export default VisualSearchModal;
