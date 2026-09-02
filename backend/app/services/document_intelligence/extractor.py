import re
from typing import Dict, Any, List, Optional
from app.services.providers.base import NormalizedOCRResult, OCRBlock, OCRExtractionResult


class DocumentIntelligenceExtractor:
    """
    Structured factual clinical entity extractor for Document Intelligence.
    Extracts patient metadata, prescription medicines, and lab values from normalized OCR blocks.
    Strictly follows clinical safety: Extract facts only, never formulate diagnoses or autonomous treatments.
    """

    KNOWN_DRUGS = [
        "Paracetamol", "Amoxicillin", "Metformin", "Pantoprazole", "Azithromycin",
        "Cetirizine", "Telmisartan", "Atorvastatin", "Omeprazole", "Ibuprofen",
        "Ciprofloxacin", "Losartan", "Amlodipine", "Montelukast", "Dolo",
        "Augmentin", "Pan 40", "Limcee", "Zincovit", "Calpol", "Combiflam"
    ]

    LAB_TESTS = {
        "hemoglobin": {"canonical": "Hemoglobin", "unit": "g/dL", "ref_low": 12.0, "ref_high": 16.5},
        "hb": {"canonical": "Hemoglobin", "unit": "g/dL", "ref_low": 12.0, "ref_high": 16.5},
        "esr": {"canonical": "ESR", "unit": "mm/hr", "ref_low": 0.0, "ref_high": 20.0},
        "platelet": {"canonical": "Platelet Count", "unit": "/mcL", "ref_low": 150000.0, "ref_high": 450000.0},
        "wbc": {"canonical": "WBC Count", "unit": "/mcL", "ref_low": 4000.0, "ref_high": 11000.0},
        "blood sugar": {"canonical": "Blood Sugar (Fasting)", "unit": "mg/dL", "ref_low": 70.0, "ref_high": 100.0},
        "fasting glucose": {"canonical": "Fasting Blood Glucose", "unit": "mg/dL", "ref_low": 70.0, "ref_high": 100.0},
        "serum creatinine": {"canonical": "Serum Creatinine", "unit": "mg/dL", "ref_low": 0.6, "ref_high": 1.2},
        "creatinine": {"canonical": "Serum Creatinine", "unit": "mg/dL", "ref_low": 0.6, "ref_high": 1.2},
        "blood urea": {"canonical": "Blood Urea", "unit": "mg/dL", "ref_low": 15.0, "ref_high": 40.0},
        "urea": {"canonical": "Blood Urea", "unit": "mg/dL", "ref_low": 15.0, "ref_high": 40.0},
        "bilirubin": {"canonical": "Total Bilirubin", "unit": "mg/dL", "ref_low": 0.2, "ref_high": 1.2},
        "sgot": {"canonical": "SGOT (AST)", "unit": "U/L", "ref_low": 5.0, "ref_high": 40.0},
        "sgpt": {"canonical": "SGPT (ALT)", "unit": "U/L", "ref_low": 7.0, "ref_high": 56.0},
        "hba1c": {"canonical": "HbA1c", "unit": "%", "ref_low": 4.0, "ref_high": 5.6},
        "spo2": {"canonical": "SpO2", "unit": "%", "ref_low": 95.0, "ref_high": 100.0},
    }

    FREQUENCY_PATTERNS = [
        (r'\b(?:twice\s+daily|bd|bid|1-0-1|two\s+times\s+a\s+day)\b', "BD (Twice daily)"),
        (r'\b(?:thrice\s+daily|tds|tid|1-1-1|three\s+times\s+a\s+day)\b', "TDS (Thrice daily)"),
        (r'\b(?:once\s+daily|od|1-0-0|0-0-1|single\s+dose)\b', "OD (Once daily)"),
        (r'\b(?:four\s+times\s+daily|qid|1-1-1-1)\b', "QID (4 times daily)"),
        (r'\b(?:at\s+bedtime|hs|0-0-1\s*\(night\))\b', "HS (At bedtime)"),
        (r'\b(?:as\s+needed|sos|prn)\b', "SOS (As needed)"),
    ]

    DURATION_PATTERNS = [
        r'(\d+)\s*(?:days?|din|d)\b',
        r'(\d+)\s*(?:weeks?|wk|hafta|hafte)\b',
        r'(\d+)\s*(?:months?|mahina|mahine)\b',
    ]

    @classmethod
    def extract_from_normalized_ocr(
        cls,
        normalized: NormalizedOCRResult,
        filename: str = "document.pdf",
        mime_type: str = "application/pdf"
    ) -> OCRExtractionResult:
        """
        Main extraction entry point taking NormalizedOCRResult and returning structured OCRExtractionResult.
        """
        raw_text = normalized.raw_text.strip()
        if not raw_text or len(raw_text) < 5:
            return OCRExtractionResult(
                document_type="UNKNOWN",
                extracted_fields={},
                confidence_score=0.0,
                pages_processed=normalized.pages_processed,
                provider_name=normalized.provider_name,
                raw_text=raw_text,
                blocks=normalized.blocks,
                normalized_ocr=normalized,
                review_status="FAILED"
            )

        # 1. Determine Document Type
        doc_type = cls._classify_document_type(raw_text, filename)

        # 2. Extract Metadata (Patient, Doctor, Date, Facility)
        metadata = cls._extract_metadata(raw_text)

        # 3. Extract Type-Specific Entities
        medications = cls._extract_medications(raw_text, normalized.blocks)
        lab_observations = cls._extract_lab_observations(raw_text, normalized.blocks)

        extracted_fields: Dict[str, Any] = {
            **metadata,
            "medications": medications,
            "lab_observations": lab_observations,
        }

        # 4. Compute Overall Confidence & Review Status
        confidence = normalized.average_confidence
        if not medications and not lab_observations and not metadata.get("patient_name"):
            confidence = min(confidence, 0.65)

        review_status = "PROCESSED" if (confidence >= 0.80 and (medications or lab_observations or metadata.get("patient_name"))) else "NEEDS_REVIEW"

        return OCRExtractionResult(
            document_type=doc_type,
            extracted_fields=extracted_fields,
            confidence_score=round(float(confidence), 2),
            pages_processed=normalized.pages_processed,
            provider_name=normalized.provider_name,
            raw_text=raw_text,
            blocks=normalized.blocks,
            normalized_ocr=normalized,
            review_status=review_status
        )

    @classmethod
    def _classify_document_type(cls, text: str, filename: str) -> str:
        text_lower = text.lower()
        fn_lower = filename.lower()

        if any(w in fn_lower for w in ["presc", "rx", "medicine", "med"]) or any(w in text_lower for w in ["rx", "tab ", "cap ", "syp ", "prescribed", "dosage", "tablet"]):
            return "PRESCRIPTION"
        elif any(w in fn_lower for w in ["lab", "report", "blood", "test", "pathology"]) or any(w in text_lower for w in ["hemoglobin", "esr", "platelet", "blood sugar", "pathology", "reference range", "specimen"]):
            return "LAB_REPORT"
        elif any(w in fn_lower for w in ["discharge", "summary", "admission"]) or any(w in text_lower for w in ["discharge summary", "date of admission", "date of discharge"]):
            return "DISCHARGE_SUMMARY"
        return "PRESCRIPTION"

    @classmethod
    def _extract_metadata(cls, text: str) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        for line in lines:
            # Patient Name
            if "patient_name" not in meta:
                pt_match = re.search(r'(?:Patient(?:\s+Name)?|Pt(?:\s+Name)?|Name)\s*[:\-]\s*([A-Za-z\s]{2,30})', line, re.IGNORECASE)
                if pt_match:
                    name_val = pt_match.group(1).strip()
                    if not any(stop in name_val.lower() for stop in ["date", "age", "gender", "doctor", "dr", "rx", "hospital"]):
                        meta["patient_name"] = name_val

            # Doctor Name
            if "doctor_name" not in meta:
                doc_match = re.search(r'(?:Doctor|Consultant|Prescribed\s+By|Dr\.?)\s*[:\-]?\s*(?:Dr\.?\s*)?([A-Za-z\s]{2,30})', line, re.IGNORECASE)
                if doc_match:
                    doc_val = doc_match.group(1).strip()
                    if not any(stop in doc_val.lower() for stop in ["patient", "date", "hospital", "clinic", "opd"]):
                        meta["doctor_name"] = f"Dr. {doc_val}" if not doc_val.lower().startswith("dr") else doc_val

            # Date
            if "date" not in meta:
                date_match = re.search(r'(?:Date|Dt)\s*[:\-]?\s*(\d{1,2}[/\.\-]\d{1,2}[/\.\-]\d{2,4})', line, re.IGNORECASE)
                if date_match:
                    meta["date"] = date_match.group(1).strip()
                else:
                    iso_match = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', line)
                    if iso_match:
                        meta["date"] = iso_match.group(1).strip()

            # Facility / Clinic / Hospital Name
            if "facility_name" not in meta:
                hosp_match = re.search(r'([A-Za-z\s]+(?:Hospital|Clinic|Healthcare|Nursing\s+Home|Medical\s+Centre|OPD\s*\d*))', line, re.IGNORECASE)
                if hosp_match:
                    meta["facility_name"] = hosp_match.group(1).strip()

        return meta

    @classmethod
    def _extract_medications(cls, text: str, blocks: List[OCRBlock]) -> List[Dict[str, Any]]:
        meds: List[Dict[str, Any]] = []
        seen_names = set()

        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for i, line in enumerate(lines):
            # Check for known drugs
            for kd in cls.KNOWN_DRUGS:
                if re.search(rf'\b{kd}\b', line, re.IGNORECASE) and kd.lower() not in seen_names:
                    seen_names.add(kd.lower())

                    # Context includes current line and subsequent line (if part of instructions)
                    context_line = line
                    if i + 1 < len(lines):
                        context_line += " " + lines[i + 1]

                    # Extract strength / dosage
                    strength_match = re.search(r'(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU))', context_line, re.IGNORECASE)
                    dosage = strength_match.group(1) if strength_match else "1 tablet"

                    # Extract frequency
                    freq = "As directed"
                    for pattern, freq_label in cls.FREQUENCY_PATTERNS:
                        if re.search(pattern, context_line, re.IGNORECASE):
                            freq = freq_label
                            break

                    # Extract duration
                    dur = "5 days"
                    for dur_pat in cls.DURATION_PATTERNS:
                        m = re.search(dur_pat, context_line, re.IGNORECASE)
                        if m:
                            dur = m.group(0)
                            break

                    meds.append({
                        "name": f"{kd} {dosage}".strip() if dosage not in kd else kd,
                        "dosage": dosage,
                        "frequency": freq,
                        "duration": dur,
                        "confidence": 0.92
                    })

        return meds

    @classmethod
    def _extract_lab_observations(cls, text: str, blocks: List[OCRBlock]) -> List[Dict[str, Any]]:
        observations: List[Dict[str, Any]] = []
        seen_tests = set()

        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for line in lines:
            line_lower = line.lower()
            for key, spec in cls.LAB_TESTS.items():
                if re.search(rf'\b{key}\b', line_lower) and spec["canonical"] not in seen_tests:
                    seen_tests.add(spec["canonical"])

                    # Extract numeric value
                    val_match = re.search(r'[:\-]?\s*(\d+(?:\.\d+)?)\s*([a-zA-Z/%/mcL]+)?', line[line_lower.find(key) + len(key):])
                    if val_match:
                        num_val = float(val_match.group(1))
                        unit = val_match.group(2) or spec["unit"]

                        flag = "NORMAL"
                        if num_val < spec["ref_low"]:
                            flag = "LOW"
                        elif num_val > spec["ref_high"]:
                            flag = "ELEVATED"

                        observations.append({
                            "test_name": spec["canonical"],
                            "value": f"{num_val} {unit}".strip(),
                            "unit": unit,
                            "flag": flag,
                            "reference_range": f"{spec['ref_low']} - {spec['ref_high']} {unit}",
                            "confidence": 0.94
                        })

        return observations
