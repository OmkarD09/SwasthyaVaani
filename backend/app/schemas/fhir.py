from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FHIRResource(BaseModel):
    resourceType: str
    id: str
    meta: Optional[Dict[str, Any]] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    id: str
    type: str = "document"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    entry: List[Dict[str, Any]] = Field(default_factory=list)


class FHIRExportResponse(BaseModel):
    intake_session_id: str
    bundle_id: str
    status: str = "VALIDATED"
    resource_count: int
    fhir_bundle: FHIRBundle
