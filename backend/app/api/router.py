from fastapi import APIRouter
from app.api.v1 import auth, intakes, doctor, documents, admin, fhir, abdm

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(intakes.router)
api_router.include_router(doctor.router)
api_router.include_router(documents.router)
api_router.include_router(admin.router)
api_router.include_router(fhir.router)
api_router.include_router(abdm.router)
