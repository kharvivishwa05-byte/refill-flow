from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from database.db import Base

class PrescriptionExtraction(Base):
    __tablename__ = "prescription_extractions"

    id = Column(Integer, primary_key=True, index=True)
    extraction_id = Column(String, unique=True, index=True)
    file_name = Column(String)
    file_type = Column(String)
    file_path = Column(String)
    
    # Extracted clinical & prescription fields
    patient_name = Column(String, nullable=True)
    prescription_date = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    doctor_license = Column(String, nullable=True)
    medication_name = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    dosage = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    route = Column(String, nullable=True)
    instructions = Column(Text, nullable=True)
    quantity = Column(String, nullable=True)
    refills = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Metadata & verification
    overall_confidence = Column(Float, default=0.9)
    field_confidences_json = Column(Text, nullable=True)
    verification_flags_json = Column(Text, nullable=True)
    verification_status = Column(String, default="PENDING_VERIFICATION")
    raw_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
