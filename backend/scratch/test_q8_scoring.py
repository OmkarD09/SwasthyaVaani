import sys
import os
import json
sys.path.insert(0, os.getcwd())
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import ClinicalStateModel
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved
from app.services.clinical_ai.domain_classifier import ClinicalDomain

db = SessionLocal()
session_id = '13acbe38-4975-4bbf-8ec1-53328731a6cf'
st_v7 = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session_id, ClinicalStateModel.version == 7).first()
state = ClinicalState(**st_v7.state_json)

print('is_field_already_resolved vomiting:', is_field_already_resolved('vomiting', state))
print('resolved_dimensions:', state.resolved_dimensions)
print('asked_dimension_history:', state.asked_dimension_history)
print('associated_symptoms:', state.associated_symptoms)

candidates = score_candidate_dimensions(
    domains=[ClinicalDomain.GASTROINTESTINAL],
    state=state,
    asked_questions=[],
    asked_target_fields=set(state.asked_dimension_history)
)

print('\nTop 15 Candidate Dimensions before Q8:')
for c in candidates[:15]:
    print(f"  {c['field_name']} (canon: {c['canonical_dimension']}) -> score: {c['score']}, mode: {c['reasoning_mode']}")
db.close()
