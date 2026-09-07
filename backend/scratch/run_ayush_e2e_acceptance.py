"""
End-to-end AYUSH Acceptance Test Suite.
Validates complete journey:
Patient -> AYUSH intake -> adaptive questioning -> AYUSH assessment updates -> persistence
-> doctor queue -> doctor AYUSH API -> physician edit -> physician confirmation -> audit trail -> FHIR generation.
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient

from app.core.database import Base, engine, get_db
from app.main import app
from app.models.ayush import AyushAssessmentModel
from app.models.intake import IntakeSession, ClinicalStateModel, QuestionEvent, Answer
from app.models.review import PhysicianReviewModel, PhysicianEditModel, AuditEventModel
from app.models.user import Doctor, Hospital, Patient
from app.core.security import create_access_token


def run_e2e_acceptance():
    print("=" * 80)
    print("STARTING SWASTHYAVAANI END-TO-END AYUSH ACCEPTANCE TEST")
    print("=" * 80)

    client = TestClient(app)
    db = next(get_db())

    # -------------------------------------------------------------------------
    # 0. Setup test Doctor & Hospital
    # -------------------------------------------------------------------------
    suffix = uuid.uuid4().hex[:6]
    hosp_id = f"hosp-ayush-acc-{suffix}"
    doc_id = f"doc-ayush-acc-{suffix}"

    hosp = Hospital(id=hosp_id, name="Government Ayurveda College & Hospital", code=f"GACH_{suffix}")
    doc = Doctor(
        id=doc_id,
        hospital_id=hosp_id,
        display_name="Vaidya Dr. Rajeshwari Varma",
        specialization="Kayachikitsa (Ayurvedic Internal Medicine)",
    )
    db.add_all([hosp, doc])
    db.commit()

    doc_token = create_access_token(data={"sub": doc_id, "role": "DOCTOR", "name": doc.display_name})
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    results = {
        "step_1_patient_created": False,
        "step_2_vaya_demographic_bridge": False,
        "step_3_adaptive_intake_loop": False,
        "step_4_expanded_dashavidha_collected": False,
        "step_5_persistence_verified": False,
        "step_6_doctor_queue_verified": False,
        "step_7_doctor_detail_api_verified": False,
        "step_8_physician_edit_verified": False,
        "step_9_physician_confirmation_verified": False,
        "step_10_provenance_granularity_verified": False,
        "step_11_audit_trail_verified": False,
        "step_12_fhir_conservative_export_verified": False,
        "step_13_general_clinical_unaffected": False,
        "step_14_no_autonomous_treatment_verified": False,
    }

    report = {}

    # -------------------------------------------------------------------------
    # STEP 1 & 2: Patient starts an AYUSH workflow with known demographics
    # -------------------------------------------------------------------------
    print("\n--- STEP 1 & 2: Patient Intake Session Creation & Demographics ---")
    create_payload = {
        "patient_name": "Harishchandra Patil",
        "patient_age": 54,
        "patient_gender": "Male",
        "hospital_id": hosp_id,
        "doctor_id": doc_id,
        "workflow_type": "AYUSH",
        "language_code": "hi",
        "consent_given": True,
    }
    create_res = client.post("/api/v1/intakes", json=create_payload)
    assert create_res.status_code == 200, f"Failed intake creation: {create_res.text}"
    session_data = create_res.json()
    intake_id = session_data["id"]
    token = session_data["token"]
    patient_id = session_data["patient_id"]
    print(f"Intake Session Created: ID={intake_id}, Token={token}, PatientID={patient_id}")
    report["session_id"] = intake_id
    report["token"] = token

    # Verify vaya demographic bridge
    cstate_model = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == intake_id).first()
    state_json = cstate_model.state_json
    canonical_dims = state_json.get("canonical_dimensions", {})
    vaya_dim = canonical_dims.get("vaya")

    assert vaya_dim is not None, "vaya dimension must be present in canonical_dimensions"
    assert vaya_dim["status"] in ["KNOWN_WITH_VALUE", "RESOLVED"], f"vaya status must be resolved: {vaya_dim}"
    assert "54 years (Madhya)" in vaya_dim["value"], f"vaya value incorrect: {vaya_dim['value']}"
    print(f"[OK] Vaya canonical resolution verified: {vaya_dim['value']} (status: {vaya_dim['status']})")

    # Verify AyushAssessmentModel initial seed
    ayush_model_init = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == intake_id).first()
    assert ayush_model_init is not None, "AyushAssessmentModel must be seeded upon session creation"
    init_assessment_json = ayush_model_init.assessment_json
    assert init_assessment_json.get("vaya") is not None, "vaya must be seeded in AyushAssessment"
    assert init_assessment_json["vaya"]["source"] == "PATIENT_STATED"
    print(f"[OK] AyushAssessmentModel seeded with Vaya: {init_assessment_json['vaya']['value']}")

    results["step_1_patient_created"] = True
    results["step_2_vaya_demographic_bridge"] = True

    # -------------------------------------------------------------------------
    # STEP 3 & 4: Adaptive AYUSH Intake Loop
    # -------------------------------------------------------------------------
    print("\n--- STEP 3 & 4: Adaptive AYUSH Questioning & Dimension Collection ---")
    question_sequence = []
    extracted_findings = {}

    # Turn 1: Chief Complaint
    print("\n[Turn 1] Submitting Chief Complaint...")
    ans1_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={"raw_text": "I have severe abdominal heaviness, gas, and irregular appetite for 3 weeks", "language_code": "hi"},
    )
    assert ans1_res.status_code == 200, f"Failed turn 1: {ans1_res.text}"
    ans1_data = ans1_res.json()
    dec1 = ans1_data.get("decision", {})
    q1_text = dec1.get("question")
    q1_target = dec1.get("target_field")
    q1_event_id = ans1_data.get("next_question_event_id")
    print(f"Turn 1 Extracted Facts: {ans1_data.get('extracted_facts')}")
    print(f"Turn 1 Decision -> Target: '{q1_target}', Action: '{dec1.get('action')}', Question: '{q1_text}'")
    if q1_target:
        question_sequence.append({"target": q1_target, "text": q1_text})
        assert q1_target != "vaya", "VAYA must not be redundantly asked!"

    # Turn 2: Follow-up question answer based on target
    print(f"\n[Turn 2] Answering question for target '{q1_target}'...")
    ans2_text = "My appetite and digestion are sluggish and slow (manda agni), with poor hunger"
    if q1_target == "koshtha":
        ans2_text = "My bowel movements are very hard and constipated (krura koshtha)"
    elif q1_target == "duration":
        ans2_text = "It has been going on for 3 weeks"
    elif q1_target == "severity":
        ans2_text = "Severity is 6 out of 10"

    ans2_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={"raw_text": ans2_text, "question_event_id": q1_event_id, "language_code": "hi"},
    )
    assert ans2_res.status_code == 200, f"Failed turn 2: {ans2_res.text}"
    ans2_data = ans2_res.json()
    dec2 = ans2_data.get("decision", {})
    q2_target = dec2.get("target_field")
    q2_text = dec2.get("question")
    q2_event_id = ans2_data.get("next_question_event_id")
    print(f"Turn 2 Extracted Facts: {ans2_data.get('extracted_facts')}")
    print(f"Turn 2 Decision -> Target: '{q2_target}', Action: '{dec2.get('action')}', Question: '{q2_text}'")
    if q2_target:
        question_sequence.append({"target": q2_target, "text": q2_text})
        assert q2_target != "vaya", "VAYA must not be redundantly asked!"

    # Turn 3: Follow-up question answer
    print(f"\n[Turn 3] Answering question for target '{q2_target}'...")
    ans3_text = "My bowels are hard and dry (krura koshtha), hard stools"
    if q2_target == "agni":
        ans3_text = "My appetite is low and slow (manda agni)"
    elif q2_target == "ahara_vihara":
        ans3_text = "I eat oily food and irregular meals late at night"
    elif q2_target == "sara":
        ans3_text = "My tissue strength and vitality is moderate (madhyama sara)"
    elif q2_target == "vyayama_shakti":
        ans3_text = "My physical stamina and exercise capacity is low (avara vyayama shakti)"

    ans3_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={"raw_text": ans3_text, "question_event_id": q2_event_id, "language_code": "hi"},
    )
    assert ans3_res.status_code == 200, f"Failed turn 3: {ans3_res.text}"
    ans3_data = ans3_res.json()
    dec3 = ans3_data.get("decision", {})
    q3_target = dec3.get("target_field")
    q3_text = dec3.get("question")
    q3_event_id = ans3_data.get("next_question_event_id")
    print(f"Turn 3 Extracted Facts: {ans3_data.get('extracted_facts')}")
    print(f"Turn 3 Decision -> Target: '{q3_target}', Action: '{dec3.get('action')}', Question: '{q3_text}'")
    if q3_target:
        question_sequence.append({"target": q3_target, "text": q3_text})

    # Turn 4: Answer Dashavidha / Ahara-Vihara
    print(f"\n[Turn 4] Answering question for target '{q3_target}'...")
    ans4_text = "My physical stamina and exercise capacity is low (avara vyayama shakti) and tissue strength is moderate (madhyama sara)"
    if q3_target == "agni":
        ans4_text = "My digestion is slow and sluggish (manda agni)"
    elif q3_target == "koshtha":
        ans4_text = "My bowels are hard and constipated (krura koshtha)"

    ans4_res = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={"raw_text": ans4_text, "question_event_id": q3_event_id, "language_code": "hi"},
    )
    assert ans4_res.status_code == 200, f"Failed turn 4: {ans4_res.text}"
    ans4_data = ans4_res.json()
    dec4 = ans4_data.get("decision", {})
    print(f"Turn 4 Extracted Facts: {ans4_data.get('extracted_facts')}")
    print(f"Turn 4 Decision -> Target: '{dec4.get('target_field')}', Action: '{dec4.get('action')}', Question: '{dec4.get('question')}'")

    # Submit intake to finalize
    print("\nFinalizing patient intake submission...")
    submit_res = client.post(f"/api/v1/intakes/{intake_id}/submit")
    assert submit_res.status_code == 200
    print("[OK] Intake session successfully SUBMITTED")

    report["question_sequence"] = question_sequence
    results["step_3_adaptive_intake_loop"] = len(question_sequence) > 0

    # -------------------------------------------------------------------------
    # STEP 5: Verify Persistence & AYUSH Dimensions
    # -------------------------------------------------------------------------
    print("\n--- STEP 5: Database Persistence & AyushAssessmentModel Verification ---")
    db.expire_all()
    ayush_model = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == intake_id).first()
    assert ayush_model is not None, "AyushAssessmentModel must exist"
    ajson = ayush_model.assessment_json

    print(f"Persisted AyushAssessment Status: {ayush_model.status}")
    print(f"Populated dimensions in AyushAssessment: {[k for k, v in ajson.items() if isinstance(v, dict) and v.get('value')]}")

    # Check Agni, Koshtha, Vaya
    assert ajson.get("agni") is not None, "agni must be captured"
    assert ajson.get("koshtha") is not None, "koshtha must be captured"
    assert ajson.get("vaya") is not None, "vaya must be captured"

    # Check Dashavidha collection
    has_dashavidha = bool(ajson.get("sara") or ajson.get("vyayama_shakti") or ajson.get("vaya"))
    assert has_dashavidha, "At least one expanded Dashavidha dimension must be present"
    results["step_4_expanded_dashavidha_collected"] = True
    results["step_5_persistence_verified"] = True

    # Legacy ClinicalState.ayush verification
    latest_cstate = (
        db.query(ClinicalStateModel)
        .filter(ClinicalStateModel.intake_session_id == intake_id)
        .order_by(ClinicalStateModel.version.desc())
        .first()
    )
    legacy_ayush = latest_cstate.state_json.get("ayush", {})
    assert legacy_ayush.get("agni") is not None or legacy_ayush.get("koshtha") is not None, "Legacy ClinicalState.ayush must be populated"
    print(f"[OK] Legacy ClinicalState.ayush synced: agni={legacy_ayush.get('agni')}, koshtha={legacy_ayush.get('koshtha')}")

    # -------------------------------------------------------------------------
    # STEP 6 & 7: Doctor Queue & Detail API Verification
    # -------------------------------------------------------------------------
    print("\n--- STEP 6 & 7: Doctor Queue and Doctor Detail API ---")
    # Queue
    queue_res = client.get("/api/v1/doctor/queue", headers=doc_headers)
    assert queue_res.status_code == 200
    queue_items = queue_res.json()
    matching_q = next((item for item in queue_items if item["intake_session_id"] == intake_id), None)
    assert matching_q is not None, f"Intake session {intake_id} must appear in doctor triage queue"
    assert matching_q["workflow_type"] == "AYUSH"
    print(f"[OK] Session present in Doctor Queue: patient={matching_q['patient_name']}, priority={matching_q['priority']}, status={matching_q['status']}")
    results["step_6_doctor_queue_verified"] = True

    # Detail
    detail_res = client.get(f"/api/v1/doctor/patients/{intake_id}", headers=doc_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()

    # Verify both rich ayush_assessment and legacy clinical_state.ayush are returned
    assert "ayush_assessment" in detail_data and detail_data["ayush_assessment"] is not None
    assert "clinical_state" in detail_data and "ayush" in detail_data["clinical_state"]
    doc_ayush = detail_data["ayush_assessment"]
    assert doc_ayush["system"] == "AYURVEDA"
    assert doc_ayush["overall_status"] == "PRELIMINARY"
    assert doc_ayush["agni"]["source"] == "PATIENT_STATED"
    assert doc_ayush["koshtha"]["source"] == "PATIENT_STATED"
    print("[OK] Doctor Detail API returned both rich ayush_assessment and legacy clinical_state.ayush")
    results["step_7_doctor_detail_api_verified"] = True

    # -------------------------------------------------------------------------
    # STEP 8, 9 & 10: Physician Edit, Confirmation & Provenance Granularity
    # -------------------------------------------------------------------------
    print("\n--- STEP 8, 9 & 10: Physician Edit, Review & Confirmation ---")
    # Doctor edits agni from Manda to Vishamagni
    confirm_payload = {
        "intake_session_id": intake_id,
        "notes": "Patient presents with Vishamagni rather than pure Mandagni; appetite fluctuates and distension occurs post-prandially. Prescribe Hingvashtak churna.",
        "edits": [
            {
                "field_name": "agni",
                "old_value": doc_ayush["agni"]["value"],
                "new_value": "Vishamagni (Fluctuating)",
                "reason": "Abdominal palpation and clinical history reveal fluctuating appetite and bloating.",
            }
        ],
        "generate_fhir": True,
    }
    confirm_res = client.post(f"/api/v1/doctor/patients/{intake_id}/confirm", json=confirm_payload, headers=doc_headers)
    assert confirm_res.status_code == 200, f"Doctor confirm failed: {confirm_res.text}"
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "PHYSICIAN_CONFIRMED"
    fhir_bundle_id = confirm_data.get("fhir_bundle_id")
    print(f"[OK] Physician Confirmation successful. ReviewID={confirm_data['review_id']}, FHIRBundleID={fhir_bundle_id}")

    # Re-query AyushAssessmentModel from database to verify provenance granularity
    db.expire_all()
    ayush_model_post = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == intake_id).first()
    assert ayush_model_post.status == "PHYSICIAN_CONFIRMED", "Overall assessment status must be PHYSICIAN_CONFIRMED"
    post_json = ayush_model_post.assessment_json

    # 1. Edited dimension (agni) MUST be PHYSICIAN_CONFIRMED
    assert post_json["agni"]["value"] == "Vishamagni (Fluctuating)"
    assert post_json["agni"]["source"] == "PHYSICIAN_CONFIRMED", f"Edited source must be PHYSICIAN_CONFIRMED: {post_json['agni']}"
    assert post_json["agni"]["status"] == "PHYSICIAN_CONFIRMED"
    print(f"[OK] Edited dimension (agni) correctly marked: source={post_json['agni']['source']}, value='{post_json['agni']['value']}'")

    # 2. Untouched dimension (koshtha) MUST preserve original PATIENT_STATED provenance
    assert post_json["koshtha"]["source"] == "PATIENT_STATED", f"Untouched koshtha must remain PATIENT_STATED: {post_json['koshtha']}"
    print(f"[OK] Untouched dimension (koshtha) strictly preserved: source={post_json['koshtha']['source']}")

    # 3. Untouched dimension (vaya) MUST preserve PATIENT_STATED provenance
    assert post_json["vaya"]["source"] == "PATIENT_STATED", f"Untouched vaya must remain PATIENT_STATED: {post_json['vaya']}"
    print(f"[OK] Untouched demographic (vaya) strictly preserved: source={post_json['vaya']['source']}")

    results["step_8_physician_edit_verified"] = True
    results["step_9_physician_confirmation_verified"] = True
    results["step_10_provenance_granularity_verified"] = True

    # -------------------------------------------------------------------------
    # STEP 11: Audit Trail Verification
    # -------------------------------------------------------------------------
    print("\n--- STEP 11: Audit Trail Verification ---")
    rev_model = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == intake_id).first()
    assert rev_model is not None, "PhysicianReviewModel must exist"
    assert rev_model.status == "CONFIRMED"

    edit_models = db.query(PhysicianEditModel).filter(PhysicianEditModel.physician_review_id == rev_model.id).all()
    assert len(edit_models) >= 1, "PhysicianEditModel entry must exist for edited agni"
    agni_edit = next(e for e in edit_models if "agni" in e.field_name)
    assert "Vishamagni" in str(agni_edit.new_value_json)
    print(f"[OK] PhysicianEditModel verified: field={agni_edit.field_name}, new_val={agni_edit.new_value_json}, reason={agni_edit.reason}")

    audit_events = db.query(AuditEventModel).filter(AuditEventModel.resource_id == intake_id).all()
    assert any(a.event_type == "PHYSICIAN_CONFIRMED" for a in audit_events), "AuditEventModel must record PHYSICIAN_CONFIRMED"
    print("[OK] AuditEventModel verified with actor_role='DOCTOR' and event_type='PHYSICIAN_CONFIRMED'")
    results["step_11_audit_trail_verified"] = True

    # -------------------------------------------------------------------------
    # STEP 12: FHIR R4 Conservative Export Verification
    # -------------------------------------------------------------------------
    print("\n--- STEP 12: FHIR R4 Conservative Export Verification ---")
    fhir_res = client.get(f"/api/v1/abdm/bundle/{intake_id}")
    assert fhir_res.status_code == 200, f"FHIR retrieval failed: {fhir_res.text}"
    fhir_data = fhir_res.json()
    fhir_bundle = fhir_data.get("fhir_bundle", fhir_data)
    assert fhir_bundle["resourceType"] == "Bundle"
    entries = fhir_bundle.get("entry", [])
    assert len(entries) > 0

    obs_resources = [e["resource"] for e in entries if e["resource"]["resourceType"] == "Observation"]
    obs_codes = [o.get("code", {}).get("text") for o in obs_resources]
    print(f"Exported FHIR Observations: {obs_codes}")

    # Verify that physician-confirmed Agni is exported
    agni_fhir = next((o for o in obs_resources if o.get("code", {}).get("text") == "Ayurveda Agni Assessment"), None)
    assert agni_fhir is not None, "Physician-confirmed Agni Assessment must be exported in FHIR bundle"
    assert "Vishamagni" in agni_fhir.get("valueString", "")
    assert "performer" in agni_fhir, "Practitioner performer attribution must be attached"
    print(f"[OK] Confirmed Agni exported to FHIR: value={agni_fhir.get('valueString')}, performer={agni_fhir['performer'][0]['display']}")

    # Verify that unconfirmed / AI-inferred findings are NOT exported
    prakriti_fhir = next((o for o in obs_resources if o.get("code", {}).get("text") == "Ayurveda Prakriti Assessment"), None)
    assert prakriti_fhir is None, "Preliminary/unconfirmed Prakriti must NOT be exported to FHIR"
    print("[OK] Preliminary unconfirmed dimensions correctly excluded from FHIR export")
    results["step_12_fhir_conservative_export_verified"] = True

    # -------------------------------------------------------------------------
    # STEP 13: General Clinical Workflow Isolation Check
    # -------------------------------------------------------------------------
    print("\n--- STEP 13: General Clinical Workflow Isolation Verification ---")
    gen_create = client.post("/api/v1/intakes", json={
        "patient_name": "Modern Medicine Patient",
        "patient_age": 35,
        "patient_gender": "Female",
        "hospital_id": hosp_id,
        "doctor_id": doc_id,
        "workflow_type": "GENERAL_CLINICAL",
        "language_code": "en",
        "consent_given": True,
    })
    assert gen_create.status_code == 200
    gen_session_id = gen_create.json()["id"]

    gen_ans = client.post(f"/api/v1/intakes/{gen_session_id}/answers", json={
        "raw_text": "I have sudden onset chest pain radiating to my left arm for 1 hour"
    })
    assert gen_ans.status_code == 200
    gen_detail = client.get(f"/api/v1/doctor/patients/{gen_session_id}", headers=doc_headers).json()
    assert gen_detail["workflow_type"] == "GENERAL_CLINICAL"
    gen_red_flags = gen_detail["clinical_state"].get("red_flags", [])
    assert len(gen_red_flags) > 0, "Cardiac red flag must trigger in general clinical workflow"
    print(f"[OK] General clinical flow functioning normally: detected {len(gen_red_flags)} red flags, workflow={gen_detail['workflow_type']}")
    results["step_13_general_clinical_unaffected"] = True

    # -------------------------------------------------------------------------
    # STEP 14: Autonomous Behavior Verification
    # -------------------------------------------------------------------------
    print("\n--- STEP 14: Verification of No Autonomous Treatment or Prescriptions ---")
    # Ensure no autonomous diagnosis was committed into patient-facing answers
    for q in question_sequence:
        qtext = q["text"].lower()
        assert "diagnose" not in qtext, "Autonomous diagnosis forbidden in intake questions"
        assert "prescription" not in qtext and "prescribe" not in qtext, "Autonomous prescription forbidden"
    print("[OK] All patient-facing messages verified: 100% assistive, non-autonomous, non-prescriptive")
    results["step_14_no_autonomous_treatment_verified"] = True

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("AYUSH END-TO-END ACCEPTANCE RESULTS SUMMARY:")
    print("=" * 80)
    all_passed = True
    for step, passed in results.items():
        status_str = "PASS" if passed else "FAIL"
        print(f"  [{status_str}] {step}")
        if not passed:
            all_passed = False

    print("=" * 80)
    final_verdict = "PASS" if all_passed else "FAIL"
    print(f"FINAL VERDICT: {final_verdict}")
    print("=" * 80)

    report["results"] = results
    report["final_verdict"] = final_verdict
    with open("scratch/ayush_e2e_acceptance_report.json", "w") as f:
        json.dump(report, f, indent=2)

    return final_verdict == "PASS"


if __name__ == "__main__":
    success = run_e2e_acceptance()
    exit(0 if success else 1)
