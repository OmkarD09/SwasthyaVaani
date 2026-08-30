from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "DOCTOR"  # DOCTOR, ADMIN, PATIENT


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str
    user_id: str


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    Clinician and Administrator authentication endpoint.
    In prototype demo mode, authenticates demo credentials and returns a signed JWT.
    """
    # Demo credentials mapping
    display_name = "Dr. Ananya Rao" if req.role == "DOCTOR" else "Administrator"
    user_id = "user_doc_01" if req.role == "DOCTOR" else "user_admin_01"
    
    token_payload = {
        "sub": user_id,
        "role": req.role,
        "name": display_name
    }
    
    token = create_access_token(token_payload)
    return TokenResponse(
        access_token=token,
        role=req.role,
        display_name=display_name,
        user_id=user_id
    )


@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve active session user information."""
    return current_user
