from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    get_current_user,
    verify_password,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    role: str | None = None  # DOCTOR, ADMIN, or inferred from account


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str
    user_id: str


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate an active clinician before issuing a signed JWT."""
    if req.role:
        requested_role = req.role.upper()
        if requested_role == "DOCTOR":
            allowed_roles = {"DOCTOR"}
        elif requested_role == "ADMIN":
            allowed_roles = {"ADMIN", "HOSPITAL_ADMIN", "SUPER_ADMIN"}
        else:
            allowed_roles = set()
    else:
        allowed_roles = {"DOCTOR", "ADMIN", "HOSPITAL_ADMIN", "SUPER_ADMIN"}

    normalized_username = req.username.casefold()
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == normalized_username,
            func.lower(User.id) == normalized_username,
        )
    ).first()

    password_matches = verify_password(
        req.password,
        user.password_hash if user else DUMMY_PASSWORD_HASH,
    )
    if (
        not user
        or not user.is_active
        or user.role not in allowed_roles
        or not password_matches
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_role = "DOCTOR" if user.role == "DOCTOR" else "ADMIN"
    
    token_payload = {
        "sub": user.id,
        "role": token_role,
        "name": user.display_name,
    }
    
    token = create_access_token(token_payload)
    return TokenResponse(
        access_token=token,
        role=token_role,
        display_name=user.display_name,
        user_id=user.id,
    )


@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve active session user information."""
    return current_user
