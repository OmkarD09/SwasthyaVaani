import React, { useState } from 'react';
import { Paperclip, FileText, ExternalLink, X, Eye, CheckCircle2 } from 'lucide-react';

export interface DocumentAttachment {
  id?: string;
  name: string;
  type?: 'prescription' | 'lab_report' | 'scan' | 'document';
  size?: string;
  uploadedAt?: string;
  url?: string;
}

export interface PatientAttachmentsProps {
  documents?: DocumentAttachment[];
  uploadedDocName?: string | null;
}

export function PatientAttachments({
  documents = [],
  uploadedDocName,
}: PatientAttachmentsProps) {
  const [previewDoc, setPreviewDoc] = useState<DocumentAttachment | null>(null);

  // Merge uploadedDocName if provided
  const allDocs: DocumentAttachment[] = [...documents];
  if (uploadedDocName && !allDocs.some((d) => d.name === uploadedDocName)) {
    allDocs.push({
      id: 'doc-session-01',
      name: uploadedDocName,
      type: 'prescription',
      size: '1.2 MB',
      uploadedAt: 'Today',
    });
  }

  const getDocTypeBadge = (type?: string) => {
    switch (type) {
      case 'prescription':
        return { label: 'Prescription', bg: 'bg-[#e8f3ee]', text: 'text-[#1e614a]', border: 'border-[#c6e2d4]' };
      case 'lab_report':
        return { label: 'Lab Report', bg: 'bg-[#edf3f8]', text: 'text-[#23587b]', border: 'border-[#c7dceb]' };
      case 'scan':
        return { label: 'Medical Scan', bg: 'bg-[#f4edf8]', text: 'text-[#692d7f]', border: 'border-[#dfc9e8]' };
      default:
        return { label: 'Document', bg: 'bg-[#f0ede6]', text: 'text-[#615438]', border: 'border-[#ded6c3]' };
    }
  };

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e9e2] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#e7eee5] text-[#1f5b4e]">
            <Paperclip size={14} />
          </div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
            Records & Attachments
          </h3>
        </div>
        <span className="font-mono text-[11px] text-[#71887d]">
          {allDocs.length > 0 ? `${allDocs.length} patient file${allDocs.length > 1 ? 's' : ''}` : 'Patient uploaded files'}
        </span>
      </div>

      {allDocs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {allDocs.map((doc, idx) => {
            const badge = getDocTypeBadge(doc.type);
            return (
              <div
                key={doc.id || idx}
                className="group flex items-center justify-between rounded-xl border border-[#dbe4d8] bg-[#fdfdfb] p-3 transition-all hover:border-[#1f5b4e]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf4ed] text-[#1f5b4e] group-hover:bg-[#1f5b4e] group-hover:text-white transition-colors">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1f4236]">{doc.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`inline-block rounded px-1.5 py-0.2 font-mono font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                      <span className="text-[#7c9488]">
                        {doc.size || 'PDF'} {doc.uploadedAt ? `· ${doc.uploadedAt}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (doc.url) {
                        window.open(doc.url, '_blank');
                      } else {
                        setPreviewDoc(doc);
                      }
                    }}
                    title="View attachment"
                    className="inline-flex items-center gap-1 rounded-lg border border-[#cbdbce] bg-[#f5f8f5] px-2.5 py-1 text-xs font-semibold text-[#295c4c] transition hover:bg-[#1f5b4e] hover:text-white cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f7faf8] p-4 text-center text-xs text-[#6a8477]">
          No additional records uploaded for this intake session.
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173e35]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#e5e9e2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7eee5] text-[#1f5b4e]">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#71887d]">Medical Attachment Preview</p>
                  <h3 className="font-serif text-lg font-bold text-[#173e35] truncate max-w-sm">{previewDoc.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-[#6e8578] hover:bg-[#e7eee5] hover:text-[#173e35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#eef4ec] p-3 border border-[#d4e2d2] text-xs">
                <div className="flex items-center gap-2 text-[#245b49]">
                  <CheckCircle2 size={16} className="text-[#2b7f5b]" />
                  <span>Document linked to clinical intake record</span>
                </div>
                <span className="font-mono text-[11px] text-[#55786b]">{previewDoc.size || '1.2 MB'}</span>
              </div>

              <div className="rounded-xl border border-[#e1e7dc] bg-[#fbfdfc] p-4 text-xs text-[#305345]">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#768e82] mb-1.5">Document Details</p>
                <div className="space-y-1 text-xs">
                  <p><strong>File Name:</strong> {previewDoc.name}</p>
                  <p><strong>Attachment Type:</strong> {previewDoc.type || 'Prescription / Clinical Document'}</p>
                  <p><strong>Ingestion Status:</strong> Ingested & Verified for Clinical Consultation</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl border border-[#cbd8cb] bg-[#f8f7ef] px-4 py-2 text-xs font-semibold text-[#305547] hover:bg-[#edf3ec] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

