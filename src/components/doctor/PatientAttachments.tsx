import { Paperclip, FileText, ExternalLink } from 'lucide-react';

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
  // Merge uploadedDocName if provided
  const allDocs: DocumentAttachment[] = [...documents];
  if (uploadedDocName && !allDocs.some((d) => d.name === uploadedDocName)) {
    allDocs.push({
      name: uploadedDocName,
      type: 'prescription',
      size: '1.2 MB',
      uploadedAt: 'Today',
    });
  }

  return (
    <section className="rounded-2xl border border-[#d8ddd3] bg-[#f8f7ef] p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#e5e9e2] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={15} className="text-[#1f5b4e]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#496559]">
            Records & Attachments
          </h3>
        </div>
        <span className="text-[11px] text-[#71887d]">
          {allDocs.length > 0 ? `${allDocs.length} attached file${allDocs.length > 1 ? 's' : ''}` : 'Patient uploaded files'}
        </span>
      </div>

      {allDocs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {allDocs.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="flex items-center justify-between rounded-xl border border-[#dbe4d8] bg-[#fdfdfb] p-3 transition hover:border-[#1f5b4e]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf4ed] text-[#1f5b4e]">
                  <FileText size={15} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#1f4236]">{doc.name}</p>
                  <p className="text-[10px] text-[#7c9488]">
                    {doc.size || 'PDF'} {doc.uploadedAt ? `· ${doc.uploadedAt}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  title="View attachment"
                  className="grid h-7 w-7 place-items-center rounded-md text-[#597a6d] hover:bg-[#ebf2ea] hover:text-[#1f5b4e] cursor-pointer"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#ccd7cc] bg-[#f7faf8] p-4 text-center text-xs text-[#6a8477]">
          No additional records uploaded.
        </div>
      )}
    </section>
  );
}
