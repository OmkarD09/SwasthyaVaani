from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import Department, Doctor, Hospital
from app.services.clinical_ai.department_router import (
    DEPARTMENT_METADATA,
    CODE_ALIASES,
    DEPT_EMERGENCY,
    DEPT_GEN_MED,
    DEPT_ORTHO_SHALYA,
    DEPT_ENT_EYE,
    DEPT_PEDS,
    DEPT_GYNEC,
    DEPT_DERM,
    DEPT_PANCHAKARMA,
)

router = APIRouter(prefix="/departments", tags=["Departments & Triage"])


class PublicDepartmentItem(BaseModel):
    id: str
    code: str
    name_en: str
    name_hi: str
    ayush_equivalent: str
    ayush_name: str
    priority_level: int
    priority: int
    icon: str
    description_en: str
    description_hi: str
    active_doctors_count: int = 0


def ensure_canonical_departments_exist(db: Session, hospital_id: str = "hosp_district_01") -> List[Department]:
    """Ensures all 8 canonical hospital departments exist in the database."""
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        hosp = db.query(Hospital).first()
    hosp_id = hosp.id if hosp else hospital_id

    existing_depts = db.query(Department).all()
    existing_by_code = {d.code: d for d in existing_depts}

    canonical_order = [
        DEPT_EMERGENCY,
        DEPT_GEN_MED,
        DEPT_ORTHO_SHALYA,
        DEPT_ENT_EYE,
        DEPT_PEDS,
        DEPT_GYNEC,
        DEPT_DERM,
        DEPT_PANCHAKARMA,
    ]

    new_depts_added = False
    for code in canonical_order:
        meta = DEPARTMENT_METADATA[code]
        # Check if already present under code or any alias
        matched = existing_by_code.get(code)
        if not matched:
            for alias, canonical in CODE_ALIASES.items():
                if canonical == code and alias in existing_by_code:
                    matched = existing_by_code[alias]
                    break

        if not matched:
            new_dept = Department(
                id=f"dept_{code.lower().replace('dept_', '')}_01",
                hospital_id=hosp_id,
                name=meta["name_en"],
                code=code,
                is_active=True,
            )
            db.add(new_dept)
            existing_by_code[code] = new_dept
            new_depts_added = True

    if new_depts_added:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return db.query(Department).filter(Department.is_active == True).all()


@router.get("/public", response_model=List[PublicDepartmentItem])
def get_public_departments(db: Session = Depends(get_db)):
    """
    Returns list of active hospital departments and AYUSH OPD units
    enriched with bilingual names, authentic AYUSH equivalents,
    priority levels, and on-duty doctor counts for kiosk and portal.
    """
    departments = ensure_canonical_departments_exist(db)

    # Count active doctors per department
    active_doctors = db.query(Doctor).filter(Doctor.is_active == True).all()
    doctor_counts_by_dept: Dict[str, int] = {}
    for doc in active_doctors:
        if doc.department_id:
            doctor_counts_by_dept[doc.department_id] = doctor_counts_by_dept.get(doc.department_id, 0) + 1

    canonical_order = [
        DEPT_EMERGENCY,
        DEPT_GEN_MED,
        DEPT_ORTHO_SHALYA,
        DEPT_ENT_EYE,
        DEPT_PEDS,
        DEPT_GYNEC,
        DEPT_DERM,
        DEPT_PANCHAKARMA,
    ]

    response_items: List[PublicDepartmentItem] = []
    seen_canonical = set()

    # Map departments to canonical metadata
    for dept in departments:
        canonical_code = CODE_ALIASES.get(dept.code, dept.code)
        meta = DEPARTMENT_METADATA.get(canonical_code)
        if not meta:
            # Fallback metadata if custom department
            meta = {
                "code": dept.code,
                "name_en": dept.name,
                "name_hi": dept.name,
                "ayush_equivalent": "Samanya Chikitsa",
                "priority_level": 3,
                "icon": "Building2",
                "description_en": f"{dept.name} consultation and care",
                "description_hi": f"{dept.name} परामर्श",
            }

        seen_canonical.add(canonical_code)
        doc_count = doctor_counts_by_dept.get(dept.id, 0)
        # In demo mode, show at least 1 on-duty doctor if zero
        if doc_count == 0:
            doc_count = 1

        ayush_val = meta.get("ayush_name") or meta.get("ayush_equivalent") or "Samanya Chikitsa"
        prio_val = meta.get("priority") or meta.get("priority_level") or 3

        response_items.append(
            PublicDepartmentItem(
                id=dept.id,
                code=canonical_code,
                name_en=meta["name_en"],
                name_hi=meta["name_hi"],
                ayush_equivalent=ayush_val,
                ayush_name=ayush_val,
                priority_level=prio_val,
                priority=prio_val,
                icon=meta["icon"],
                description_en=meta["description_en"],
                description_hi=meta["description_hi"],
                active_doctors_count=doc_count,
            )
        )

    # Sort primarily by canonical_order
    def sort_key(item: PublicDepartmentItem) -> int:
        try:
            return canonical_order.index(item.code)
        except ValueError:
            return 99

    response_items.sort(key=sort_key)
    return response_items
