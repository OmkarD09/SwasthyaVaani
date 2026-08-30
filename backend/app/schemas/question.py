from typing import Optional, Literal
from pydantic import BaseModel, Field


class QuestionDecision(BaseModel):
    """Result of adaptive question evaluation engine."""
    action: Literal["ASK", "STOP", "ESCALATE"]
    question: Optional[str] = Field(default=None, description="The clinical question to present to the patient")
    target_field: Optional[str] = Field(default=None, description="The clinical state field targeted by this question")
    reason: Optional[str] = Field(default=None, description="Machine-readable rationale for question selection or stop")
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    language_code: str = "en"


class CandidateQuestion(BaseModel):
    text: str
    target_field: str
    priority: int = 1
    relevance_score: float = 1.0


class QuestionEventResponse(BaseModel):
    id: str
    intake_session_id: str
    sequence_number: int
    question_text: str
    target_field: str
    decision_action: str
    reason: Optional[str] = None
