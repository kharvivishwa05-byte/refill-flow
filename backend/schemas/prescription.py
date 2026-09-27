from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class PrescriptionData(BaseModel):
    patient_name: Optional[str] = None
    prescription_date: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_license: Optional[str] = None
    medication_name: Optional[str] = None
    strength: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    quantity: Optional[str] = None
    refills: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionVerificationRequest(PrescriptionData):
    pass

class PrescriptionTextAnalysisRequest(BaseModel):
    text: str

class PrescriptionExtractionResponse(BaseModel):
    extraction_id: str
    file_name: str
    file_type: str
    file_path: Optional[str] = None
    extracted_data: PrescriptionData
    overall_confidence: float
    field_confidences: Dict[str, float]
    verification_flags: List[str]
    verification_status: str
    raw_text: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
