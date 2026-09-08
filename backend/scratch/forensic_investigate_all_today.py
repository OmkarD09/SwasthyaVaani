import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.intake import IntakeSession, QuestionEvent, Answer
from app.models.user import Patient

db = SessionLocal()
sessions_today = db.query(IntakeSession).filter(IntakeSession.started_at >= '2026-09-07').order_by(IntakeSession.started_at.desc()).all()
print(f"Total sessions today: {len(sessions_today)}", flush=True)
for s in sessions_today:
    pat = db.query(Patient).filter(Patient.id == s.patient_id).first() if s.patient_id else None
    q_cnt = db.query(QuestionEvent).filter(QuestionEvent.intake_session_id == s.id).count()
    a_cnt = db.query(Answer).filter(Answer.intake_session_id == s.id).count()
    print(f"Session {s.id} | token {s.token} | patient {pat.display_name if pat else 'None'} | status {s.status} | QEs: {q_cnt} | Answers: {a_cnt} | started: {s.started_at}", flush=True)
db.close()
