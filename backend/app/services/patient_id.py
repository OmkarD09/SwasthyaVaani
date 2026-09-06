from sqlalchemy.orm import Session
from app.models.user import Patient


def generate_next_patient_display_id(db: Session) -> str:
    """
    Generate a sequential, unique, human-readable patient display ID:
    P001, P002, P003, P004...
    Calculates the maximum existing numeric suffix among all assigned P-prefixed
    display IDs in the database and returns the next padded string.
    """
    patients = db.query(Patient.display_id).filter(Patient.display_id.isnot(None)).all()
    max_num = 0
    for (pid,) in patients:
        if pid and isinstance(pid, str) and pid.startswith("P"):
            digits = pid[1:]
            if digits.isdigit():
                max_num = max(max_num, int(digits))

    next_num = max_num + 1
    return f"P{next_num:03d}"
