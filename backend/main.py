import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.db import Base, engine
from models.refill_case import RefillCase
from models.audit_event import AuditEvent
from models.prescription import PrescriptionExtraction

from api.refill_routes import router as refill_router
from api.prescription_routes import router as prescription_router


app = FastAPI(
    title="RefillFlow",
    version="1.0.0"
)


frontend_origins = os.getenv("FRONTEND_ORIGIN", "").strip()
if frontend_origins and frontend_origins != "*":
    origins = [origin.strip() for origin in frontend_origins.split(",") if origin.strip()]
    allow_credentials = True
else:
    origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Register API routes
app.include_router(refill_router)
app.include_router(prescription_router)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "RefillFlow Backend Running",
        "system": "Online",
        "features": ["Refill Control Tower", "AI Prescription Assistant"]
    }