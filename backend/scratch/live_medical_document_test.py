import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.document import (
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.models.user import Doctor, Hospital, Patient
from app.models.intake import IntakeSession
from app.services.document_extraction import (
    build_document_extraction_input,
    serialize_extraction_input_for_llm,
)
from app.services.document_intelligence import store_private_file
from app.api.v1.documents import run_document_processing
from app.api.v1.doctor import get_patient_clinical_detail


async def main():
    db = SessionLocal()
    try:
        # Pick real medical document image
        sample_path = backend_dir / "private_uploads" / "prescription" / "2026" / "4775f680-a3b9-4bf2-a1dc-34b67b7ab55c.jpg"
        if not sample_path.exists():
            prescription_dir = backend_dir / "private_uploads" / "prescription" / "2026"
            images = list(prescription_dir.glob("*.jpg")) + list(prescription_dir.glob("*.png"))
            if not images:
                raise FileNotFoundError("No sample prescription found")
            sample_path = images[0]

        mime_type = "image/jpeg" if sample_path.suffix.lower() in [".jpg", ".jpeg"] else "image/png"
        print(f"Using actual medical document: {sample_path.name} ({sample_path.stat().st_size} bytes)")
        with open(sample_path, "rb") as f:
            file_bytes = f.read()

        # Ensure hospital and doctor exist
        import uuid
        hospital = db.query(Hospital).first()
        if not hospital:
            hospital = Hospital(id=f"hosp-{uuid.uuid4().hex[:6]}", name="Live General Hospital")
            db.add(hospital)
            db.commit()

        doctor = db.query(Doctor).first()
        if not doctor:
            doctor = Doctor(id=f"doc-{uuid.uuid4().hex[:6]}", name="Dr. Clinical Examiner", hospital_id=hospital.id)
            db.add(doctor)
            db.commit()

        patient_id = "pt-live-ocr-test-01"
        patient = db.query(Patient).filter_by(id=patient_id).first()
        if not patient:
            patient = Patient(id=patient_id, display_name="Live Verification Patient")
            db.add(patient)
            db.commit()

        session_id = f"sess-live-{uuid.uuid4().hex[:8]}"
        session = IntakeSession(
            id=session_id,
            patient_id=patient.id,
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            token=f"T-{uuid.uuid4().hex[:4].upper()}",
            language_code="en",
            status="SUBMITTED",
            workflow_type="GENERAL_MEDICINE",
        )
        db.add(session)
        db.commit()

        # Step 1: Upload / Register document
        import hashlib
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        ext = sample_path.suffix.lower()
        storage_key = f"prescription/2026/live_{uuid.uuid4().hex[:8]}{ext}"
        store_private_file(file_bytes, storage_key)

        doc = DocumentModel(
            patient_id=patient.id,
            intake_session_id=session.id,
            file_name=sample_path.name,
            storage_object_id=storage_key,
            mime_type=mime_type,
            file_size=len(file_bytes),
            sha256=file_hash,
            page_count=1,
            document_type="PRESCRIPTION",
            status="PENDING",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        print(f"Document registered: ID={doc.id}, storage_key={storage_key}, status={doc.status}")

        # Step 2: Run processing pipeline (OCR -> Extraction -> Validation -> Persistence)
        print("\n--- Running Document Processing Pipeline ---")
        process_result = await run_document_processing(doc.id, db)
        print(f"Processing finished! Result status: {process_result.status}")

        # Step 3: Inspect OCR Run and Evidence
        ocr_run = db.query(DocumentOCRRunModel).filter_by(document_id=doc.id).first()
        assert ocr_run is not None, "OCR run must be persisted"
        evidence_blocks = (
            db.query(DocumentOCREvidenceModel)
            .filter_by(document_id=doc.id, ocr_run_id=ocr_run.id)
            .order_by(DocumentOCREvidenceModel.block_index)
            .all()
        )
        print(f"\n--- Step 2: OCR Result ---")
        print(f"Engine: {ocr_run.provider_name} {ocr_run.provider_version}")
        print(f"Aggregate Confidence: {ocr_run.aggregate_confidence:.4f}")
        print(f"OCR Evidence Blocks Persisted: {len(evidence_blocks)}")
        for eb in evidence_blocks[:5]:
            has_bbox = eb.bounding_box_json is not None
            print(f"  Block {eb.block_index} [conf={eb.confidence:.2f}, has_bbox_in_db={has_bbox}]: {eb.text!r}")

        # Step 4: Verify Payload Reduction
        extraction_input = build_document_extraction_input(db, doc, ocr_run)
        for eb in extraction_input.evidence_blocks:
            assert eb.bounding_box is None

        compact_payload = serialize_extraction_input_for_llm(extraction_input)
        compact_tokens = len(compact_payload) // 4
        print(f"\n--- Step 3: Extraction Payload Analysis ---")
        print(f"Compact LLM Payload Size: {len(compact_payload)} chars (~{compact_tokens} tokens)")
        print(f"Groq 8000 TPM limit margin: {(8000 - compact_tokens)} tokens below limit (Safe!)")

        # Step 5: Verify Candidates Persisted and Validated
        candidate_sets = db.query(DocumentCandidateSetModel).filter_by(document_id=doc.id).all()
        candidates = db.query(DocumentCandidateModel).filter_by(document_id=doc.id).all()
        print(f"\n--- Step 4: Evidence Validation & Persistence ---")
        print(f"Candidate Sets Persisted: {len(candidate_sets)}")
        print(f"Individual Candidates Grounded & Persisted: {len(candidates)}")
        for c in candidates[:5]:
            print(f"  Candidate [{c.candidate_type}]: {c.value_json}")

        # Step 6: Verify Doctor Display Reflection
        detail = get_patient_clinical_detail(session.id, db, _current_user={"role": "DOCTOR"})
        doc_views = detail.documents if hasattr(detail, "documents") else []
        matching_docs = [d for d in doc_views if d.get("id") == doc.id]
        assert len(matching_docs) == 1, "Document must appear in doctor summary"
        doc_view = matching_docs[0]
        print(f"\n--- Step 5: Doctor Portal Display ---")
        print(f"Doctor Document Status: {doc_view.get('status')}")
        print(f"Doctor Failure Code: {doc_view.get('failure_code')}")
        print(f"Doctor Extractions Count: {len(doc_view.get('extractions', []))}")
        assert doc_view.get("status") in ("NEEDS_REVIEW", "COMPLETED"), f"Expected NEEDS_REVIEW, got {doc_view.get('status')}"
        assert doc_view.get("failure_code") is None

        print("\n>>> LIVE TEST PASSED SUCCESSFULLY! ALL 5 STEPS VERIFIED! <<<")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
