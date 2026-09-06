import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, type CameraDevice } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, X, AlertCircle, Upload, ScanLine } from 'lucide-react';

export interface AbhaQrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function AbhaQrScanner({ onScan, onClose }: AbhaQrScannerProps) {
  const scannerContainerId = useRef(`abha-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  const [cameraState, setCameraState] = useState<'initializing' | 'scanning' | 'permission_denied' | 'no_camera' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);

  // Development-only diagnostic display state
  const [devDiag, setDevDiag] = useState({
    activeCamera: 'Initializing...',
    status: 'Starting camera...',
    barcodeDetectorActive: false,
  });

  const stopAndCleanScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (qrCodeScannerRef.current) {
      try {
        if (qrCodeScannerRef.current.isScanning) {
          await qrCodeScannerRef.current.stop();
        }
        qrCodeScannerRef.current.clear();
      } catch {
        // Suppress cleanup error
      } finally {
        qrCodeScannerRef.current = null;
      }
    }
  };

  const startScanningWithCamera = async (cameraIdOrConfig?: string | { facingMode: string }) => {
    try {
      setCameraState('initializing');
      setErrorMessage('');

      // Check browser MediaDevices support
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('no_camera');
        setErrorMessage('Camera access is not supported by your browser or requires a secure HTTPS connection.');
        return;
      }

      await stopAndCleanScanner();
      isStoppingRef.current = false;

      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      if (import.meta.env.DEV) {
        console.log('[SCANNER_DEV] Camera initialized. Native BarcodeDetector supported:', hasBarcodeDetector);
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      qrCodeScannerRef.current = html5QrCode;

      // Enumerate available cameras
      let availableDevices: CameraDevice[] = [];
      try {
        availableDevices = await Html5Qrcode.getCameras();
        if (availableDevices && availableDevices.length > 0) {
          setCameras(availableDevices);
        }
      } catch {
        // Enumerate can fail if permission is not yet granted; ignore here
      }

      // HIGH TOLERANCE CAMERA CONFIGURATION:
      // 1. Omit 'qrbox' so html5-qrcode scans the ENTIRE camera frame without downsampling or cropping.
      // 2. Omit 'aspectRatio' to preserve the camera's native sensor geometry and avoid module distortion.
      // 3. Higher frame rate (20 FPS) for rapid capture during focus locks.
      const scanConfig = {
        fps: 20,
      };

      const handleScanSuccess = async (decodedText: string) => {
        if (import.meta.env.DEV) {
          console.log('%c[SCANNER_DEV] QR code detected!', 'color: #10b981; font-weight: bold;', `Length: ${decodedText.length} chars`);
          setDevDiag((prev) => ({
            ...prev,
            status: `QR detected (${decodedText.length} chars)`,
          }));
        }
        if (isStoppingRef.current) return;
        await stopAndCleanScanner();
        onScan(decodedText);
      };

      const handleScanFrame = (frameErrorMessage: string) => {
        if (import.meta.env.DEV && frameErrorMessage) {
          const errStr = String(frameErrorMessage);
          // Only log unexpected decode errors (not routine "no QR found in frame")
          if (!errStr.includes('No MultiFormat Readers') && !errStr.includes('NotFoundException')) {
            console.debug('[SCANNER_DEV] Decode anomaly / checksum error:', errStr);
          }
        }
      };

      // Select camera using exact device ID string or compliant 1-key facingMode object
      let targetCamera: string | { facingMode: 'environment' | 'user' };
      let activeCamLabel = 'Default Camera';

      if (typeof cameraIdOrConfig === 'string') {
        targetCamera = cameraIdOrConfig;
        activeCamLabel = `Camera ${cameraIdOrConfig.slice(0, 6)}`;
      } else if (availableDevices.length > 0) {
        const backCamera = availableDevices.find((c) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        const chosen = backCamera || availableDevices[0];
        targetCamera = chosen.id;
        activeCamLabel = chosen.label || (backCamera ? 'Rear Camera' : 'Front Camera');
      } else {
        targetCamera = { facingMode: 'environment' };
        activeCamLabel = 'Rear / Environment';
      }

      try {
        if (import.meta.env.DEV) {
          console.log('[SCANNER_DEV] Starting camera with:', targetCamera);
        }
        await html5QrCode.start(
          targetCamera,
          scanConfig,
          handleScanSuccess,
          handleScanFrame
        );
      } catch (firstErr: unknown) {
        // Fallback for devices where the first camera mode failed
        if (import.meta.env.DEV) {
          console.warn('[SCANNER_DEV] First camera attempt failed, trying fallback camera...', firstErr);
        }
        await html5QrCode.start(
          { facingMode: 'user' },
          scanConfig,
          handleScanSuccess,
          handleScanFrame
        );
        activeCamLabel = 'Front / User Camera';
      }

      if (import.meta.env.DEV) {
        console.log('[SCANNER_DEV] Scanning started (full-frame mode, 20 FPS).');
        setDevDiag({
          activeCamera: activeCamLabel,
          status: 'Scanning (Full Frame)...',
          barcodeDetectorActive: hasBarcodeDetector,
        });
      }

      setCameraState('scanning');
    } catch (err: unknown) {
      const errorObj = err as Error & { name?: string };
      const errName = errorObj?.name || '';
      const errMsg = errorObj?.message || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('permission')) {
        setCameraState('permission_denied');
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser site settings to scan your QR code.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraState('no_camera');
        setErrorMessage('No camera was detected on this device.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraState('error');
        setErrorMessage('Your camera is currently in use by another application or tab.');
      } else {
        setCameraState('error');
        setErrorMessage(errMsg || 'Failed to start camera. Please try again.');
      }
    }
  };

  useEffect(() => {
    startScanningWithCamera();

    return () => {
      stopAndCleanScanner();
    };
  }, []);

  const handleSwitchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setActiveCameraId(nextCamera.id);
    startScanningWithCamera(nextCamera.id);
  };

  const handleClose = async () => {
    await stopAndCleanScanner();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCameraState('initializing');
      await stopAndCleanScanner();
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      if (import.meta.env.DEV) {
        console.log('%c[SCANNER_DEV] File QR code detected!', 'color: #10b981; font-weight: bold;', `Length: ${decodedText.length} chars`);
      }
      onScan(decodedText);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[SCANNER_DEV] File decode error / no QR found in image:', err);
      }
      setCameraState('error');
      setErrorMessage('Could not detect a clear QR code in this image. Please upload a high-resolution photo or use the live camera.');
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-2xl border border-neutral-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide">Scan Health QR Code</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label="Close scanner"
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera Viewport Area */}
      <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Temporary Development Status Diagnostic Bar */}
        {import.meta.env.DEV && cameraState === 'scanning' && (
          <div className="absolute top-2.5 left-3 right-3 z-20 pointer-events-none flex items-center justify-between px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] text-neutral-300 font-mono border border-neutral-700/60 shadow-md">
            <span className="truncate max-w-[140px] text-neutral-400">{devDiag.activeCamera}</span>
            <span className="text-emerald-400 font-semibold">{devDiag.status}</span>
            <span className="text-neutral-400">{devDiag.barcodeDetectorActive ? 'Native HW' : 'ZXing JS'}</span>
          </div>
        )}

        {/* Reticle Overlay during scanning - Full frame detection guide */}
        {cameraState === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {/* Viewfinder Target (visual aiming guide) */}
            <div className="relative w-72 h-72 border border-emerald-400/30 rounded-2xl">
              {/* Corner Indicators */}
              <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-xs" />
              <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-xs" />
              <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-xs" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-xs" />

              {/* Animated Scan Line */}
              <div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"
                style={{
                  top: '50%',
                  boxShadow: '0 0 10px 2px rgba(52, 211, 153, 0.65)',
                }}
              />
            </div>

            <p className="mt-4 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-xs text-neutral-200 font-medium tracking-wide flex items-center gap-1.5">
              <ScanLine size={13} className="text-emerald-400" />
              <span>Full-frame scanning · Hold QR anywhere in view</span>
            </p>
          </div>
        )}

        {/* Initializing State */}
        {cameraState === 'initializing' && (
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RefreshCw size={28} className="text-emerald-400 animate-spin" />
            <p className="text-sm text-neutral-300 font-medium">Starting camera preview…</p>
            <span className="text-xs text-neutral-500">Please allow camera permissions when prompted.</span>
          </div>
        )}

        {/* Error or Permission Denied State */}
        {(cameraState === 'permission_denied' || cameraState === 'no_camera' || cameraState === 'error') && (
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
              {cameraState === 'no_camera' ? <CameraOff size={28} /> : <AlertCircle size={28} />}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">
                {cameraState === 'permission_denied'
                  ? 'Camera Access Required'
                  : cameraState === 'no_camera'
                  ? 'No Camera Detected'
                  : 'Camera Error'}
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => startScanningWithCamera()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Try Again
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw size={13} />
              <span>Switch</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer">
            <Upload size={13} />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="text-xs font-medium text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
