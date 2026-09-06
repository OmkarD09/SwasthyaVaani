import { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  User,
  Phone,
  CreditCard,
  AtSign,
  Calendar,
} from 'lucide-react';
import { AbhaQrScanner } from './AbhaQrScanner';
import { parseAbhaQr, type ParsedQrPatientData } from '../utils/parseAbhaQr';

export interface AbhaVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ParsedQrPatientData) => void;
}

type ModalStep = 'initial' | 'scanning' | 'success' | 'error';

export function AbhaVerificationModal({
  isOpen,
  onClose,
  onApplyData,
}: AbhaVerificationModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>('initial');
  const [extractedData, setExtractedData] = useState<ParsedQrPatientData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleScan = (decodedText: string) => {
    if (import.meta.env.DEV) {
      console.log('[DEV_DIAGNOSIS] Modal received QR payload. Length:', decodedText.length, 'Type:', typeof decodedText);
    }
    const result = parseAbhaQr(decodedText);
    if (import.meta.env.DEV) {
      console.log('[DEV_DIAGNOSIS] Parse evaluation:', {
        success: result.success,
        formatDetected: result.formatDetected,
        fieldsFound: Object.keys(result.data),
      });
    }
    if (result.success && result.hasPatientInfo) {
      setExtractedData(result.data);
      setModalStep('success');
    } else {
      setErrorMessage(result.error || 'Unable to read this QR code. Please try again.');
      setModalStep('error');
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyData(extractedData);
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setModalStep('initial');
    setExtractedData(null);
    setErrorMessage('');
    onClose();
  };

  const handleScanAgain = () => {
    setExtractedData(null);
    setErrorMessage('');
    setModalStep('scanning');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-emerald-950/10 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Health QR Scanner</h3>
              <p className="text-xs text-neutral-500">Auto-fill details from your health card</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/50 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {/* 1. INITIAL STATE */}
          {modalStep === 'initial' && (
            <div className="flex flex-col items-center text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs">
                <QrCode size={36} />
              </div>

              <div className="space-y-2 max-w-sm">
                <h4 className="text-lg font-semibold text-neutral-900">
                  Scan Your ABHA / Health QR Code
                </h4>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Scan your physical or digital ABHA card, Ayushman Bharat card, or health ID QR code to automatically fill your details.
                </p>
              </div>

              <div className="w-full bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-left text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <span>Note on QR Import</span>
                </div>
                <p className="text-amber-800/90 leading-normal">
                  QR decoding reads patient demographics locally in your browser. This enables rapid auto-fill and does not perform online ABDM identity verification.
                </p>
              </div>

              <div className="w-full pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalStep('scanning')}
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <QrCode size={18} />
                  <span>Scan QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 2. SCANNING STATE */}
          {modalStep === 'scanning' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Scanning...
                </span>
              </div>
              <AbhaQrScanner onScan={handleScan} onClose={() => setModalStep('initial')} />
            </div>
          )}

          {/* 3. SUCCESS STATE */}
          {modalStep === 'success' && extractedData && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl">
                <CheckCircle2 size={22} className="text-emerald-700 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-950">QR Data Detected</h4>
                  <p className="text-xs text-emerald-800/90">
                    Information imported from QR. Review the extracted fields below:
                  </p>
                </div>
              </div>

              {/* Extracted Fields Display */}
              <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden bg-neutral-50/30">
                {extractedData.fullName && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">
                      <User size={15} /> Full Name
                    </span>
                    <span className="font-medium text-neutral-900">{extractedData.fullName}</span>
                  </div>
                )}

                {(extractedData.age !== undefined || extractedData.dateOfBirth) && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">
                      <Calendar size={15} /> Age / DOB
                    </span>
                    <span className="font-medium text-neutral-900">
                      {extractedData.age !== undefined ? `${extractedData.age} yrs` : ''}
                      {extractedData.dateOfBirth ? ` (${extractedData.dateOfBirth})` : ''}
                    </span>
                  </div>
                )}

                {extractedData.gender && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">Gender</span>
                    <span className="font-medium text-neutral-900">{extractedData.gender}</span>
                  </div>
                )}

                {extractedData.phone && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">
                      <Phone size={15} /> Phone
                    </span>
                    <span className="font-mono font-medium text-neutral-900">{extractedData.phone}</span>
                  </div>
                )}

                {extractedData.abhaId && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">
                      <CreditCard size={15} /> ABHA Number (Detected)
                    </span>
                    <span className="font-mono font-medium text-neutral-900">{extractedData.abhaId}</span>
                  </div>
                )}

                {extractedData.abhaAddress && (
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs">
                      <AtSign size={15} /> ABHA Address
                    </span>
                    <span className="font-mono font-medium text-neutral-900">{extractedData.abhaAddress}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Check size={17} />
                  <span>Use These Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={15} />
                  <span>Scan Again</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. ERROR STATE */}
          {modalStep === 'error' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
                <AlertTriangle size={30} />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-base font-semibold text-neutral-900">
                  Unable to read this QR code.
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {errorMessage || 'The scanned QR code could not be parsed as a supported health profile format.'}
                </p>
                <p className="text-xs text-neutral-500 pt-1">
                  Please try again, or enter your information manually below.
                </p>
              </div>

              <div className="w-full pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RotateCcw size={15} />
                  <span>Scan Again</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
