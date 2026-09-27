import os
import uuid
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import FileResponse
from docx import Document
from docx.shared import Inches, Pt
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.db import get_db
from models.prescription import PrescriptionExtraction
from models.refill_case import RefillCase
from models.audit_event import AuditEvent
from schemas.prescription import (
    PrescriptionExtractionResponse,
    PrescriptionVerificationRequest,
    PrescriptionTextAnalysisRequest,
    PrescriptionData
)
from services.prescription_ai_service import process_prescription_with_ai
from services.workflow_service import WorkflowService

router = APIRouter(prefix="/prescription", tags=["Prescription Intelligence Assistant"])

if os.getenv("VERCEL"):
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads/prescriptions")
else:
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "prescriptions"))

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass



def generate_rx_id(db: Session) -> str:
    """Generate human readable extraction ID like RX-101, RX-102."""
    latest_id = db.query(func.max(PrescriptionExtraction.id)).scalar()
    next_num = (latest_id or 0) + 1
    return f"RX-{next_num:04d}"


def generate_case_id(db: Session) -> str:
    latest_number = db.query(func.max(RefillCase.id)).scalar()
    next_number = (latest_number or 0) + 1
    return f"RF-{next_number:03d}"


@router.post("/upload")
async def upload_prescriptions(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload single or multiple prescription documents (JPG, PNG, PDF, TXT).
    Processes with OCR/Vision AI and extracts structured JSON.
    """
    results = []

    for file in files:
        file_bytes = await file.read()
        filename = file.filename or "prescription_document.png"
        
        # Save file to disk
        unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
        saved_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

        relative_file_url = f"/prescription/file/{unique_name}"

        # AI Extraction workflow
        extracted = await process_prescription_with_ai(file_bytes, filename)

        rx_id = generate_rx_id(db)

        # Field confidences JSON & verification flags
        fc_json = json.dumps(extracted.get("field_confidences", {}))
        vf_json = json.dumps(extracted.get("verification_flags", []))

        db_item = PrescriptionExtraction(
            extraction_id=rx_id,
            file_name=filename,
            file_type=file.content_type or "image/png",
            file_path=relative_file_url,
            patient_name=extracted.get("patient_name"),
            prescription_date=extracted.get("prescription_date"),
            doctor_name=extracted.get("doctor_name"),
            doctor_license=extracted.get("doctor_license"),
            medication_name=extracted.get("medication_name"),
            strength=extracted.get("strength"),
            dosage=extracted.get("dosage"),
            frequency=extracted.get("frequency"),
            duration=extracted.get("duration"),
            route=extracted.get("route"),
            instructions=extracted.get("instructions"),
            quantity=extracted.get("quantity"),
            refills=extracted.get("refills"),
            notes=extracted.get("notes"),
            overall_confidence=float(extracted.get("overall_confidence", 0.9)),
            field_confidences_json=fc_json,
            verification_flags_json=vf_json,
            verification_status="PENDING_VERIFICATION",
            raw_text=extracted.get("raw_text")
        )

        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        results.append(format_extraction_response(db_item))

    return {
        "message": f"Successfully processed {len(results)} prescription document(s)",
        "extractions": results
    }


@router.post("/sample-load/{sample_type}")
async def load_sample_prescription(
    sample_type: str,
    db: Session = Depends(get_db)
):
    """
    Load a pre-configured sample prescription for instant demo/testing.
    sample_type: 'augmentin', 'metformin', or 'lipitor'
    """
    sample_type_clean = sample_type.lower()
    
    if "augmentin" in sample_type_clean:
        filename = "Augmentin_Prescription_Sample.png"
        sample_bytes = b"Sample Augmentin prescription document"
    elif "metformin" in sample_type_clean:
        filename = "Metformin_ER_Prescription.pdf"
        sample_bytes = b"Sample Metformin prescription document"
    else:
        filename = "Lipitor_Prescription_Card.jpg"
        sample_bytes = b"Sample Lipitor prescription document"

    extracted = await process_prescription_with_ai(sample_bytes, filename)
    rx_id = generate_rx_id(db)

    db_item = PrescriptionExtraction(
        extraction_id=rx_id,
        file_name=filename,
        file_type="image/png" if not filename.endswith(".pdf") else "application/pdf",
        file_path=None,
        patient_name=extracted.get("patient_name"),
        prescription_date=extracted.get("prescription_date"),
        doctor_name=extracted.get("doctor_name"),
        doctor_license=extracted.get("doctor_license"),
        medication_name=extracted.get("medication_name"),
        strength=extracted.get("strength"),
        dosage=extracted.get("dosage"),
        frequency=extracted.get("frequency"),
        duration=extracted.get("duration"),
        route=extracted.get("route"),
        instructions=extracted.get("instructions"),
        quantity=extracted.get("quantity"),
        refills=extracted.get("refills"),
        notes=extracted.get("notes"),
        overall_confidence=float(extracted.get("overall_confidence", 0.95)),
        field_confidences_json=json.dumps(extracted.get("field_confidences", {})),
        verification_flags_json=json.dumps(extracted.get("verification_flags", [])),
        verification_status="PENDING_VERIFICATION",
        raw_text=extracted.get("raw_text")
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return {
        "message": "Sample prescription loaded and processed",
        "extraction": format_extraction_response(db_item)
    }


@router.get("/extractions")
def get_extractions(db: Session = Depends(get_db)):
    """Retrieve all prescription extractions."""
    items = db.query(PrescriptionExtraction).order_by(PrescriptionExtraction.created_at.desc()).all()
    return [format_extraction_response(item) for item in items]


@router.get("/extractions/{extraction_id}")
def get_extraction(extraction_id: str, db: Session = Depends(get_db)):
    """Retrieve a single prescription extraction by extraction_id."""
    item = db.query(PrescriptionExtraction).filter(PrescriptionExtraction.extraction_id == extraction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Prescription extraction not found")
    return format_extraction_response(item)


@router.get("/extractions/{extraction_id}/docx")
def export_extraction_docx(extraction_id: str, db: Session = Depends(get_db)):
    """Export an extracted prescription record as a Word document."""
    item = db.query(PrescriptionExtraction).filter(
        PrescriptionExtraction.extraction_id == extraction_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Prescription extraction not found")

    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)

    title = document.add_heading("Prescription Intelligence Report", 0)
    title.alignment = 1
    subtitle = document.add_paragraph(f"Extraction ID: {item.extraction_id}")
    subtitle.alignment = 1

    document.add_heading("Verification Summary", level=1)
    summary = document.add_table(rows=0, cols=2)
    summary.style = "Light Shading Accent 1"
    for label, value in (
        ("Source file", item.file_name),
        ("Verification status", item.verification_status),
        ("Overall AI confidence", f"{(item.overall_confidence or 0.0) * 100:.0f}%"),
        ("Processed at", item.created_at.isoformat() if item.created_at else ""),
    ):
        cells = summary.add_row().cells
        cells[0].text = label
        cells[1].text = value or "Not available"

    document.add_heading("Structured Prescription Data", level=1)
    data = format_extraction_response(item)["extracted_data"]
    fields = (
        ("Patient name", "patient_name"),
        ("Prescription date", "prescription_date"),
        ("Doctor name", "doctor_name"),
        ("Doctor license / NPI", "doctor_license"),
        ("Medicine name", "medication_name"),
        ("Strength", "strength"),
        ("Dosage", "dosage"),
        ("Frequency", "frequency"),
        ("Duration", "duration"),
        ("Route", "route"),
        ("Instructions", "instructions"),
        ("Quantity", "quantity"),
        ("Refills", "refills"),
        ("Notes", "notes"),
    )
    prescription_table = document.add_table(rows=1, cols=2)
    prescription_table.style = "Light Shading Accent 1"
    prescription_table.rows[0].cells[0].text = "Field"
    prescription_table.rows[0].cells[1].text = "Extracted value"
    for label, key in fields:
        cells = prescription_table.add_row().cells
        cells[0].text = label
        cells[1].text = str(data.get(key) or "Not available")

    flags = json.loads(item.verification_flags_json) if item.verification_flags_json else []
    if flags:
        document.add_heading("Review Flags", level=1)
        for flag in flags:
            document.add_paragraph(flag, style="List Bullet")

    document.add_paragraph(
        "Generated by RefillFlow AI Prescription Assistant. This report supports operational verification and does not replace clinical judgment."
    ).style = document.styles["Normal"]
    document.styles["Normal"].font.name = "Aptos"
    document.styles["Normal"].font.size = Pt(10)

    output_path = os.path.join(UPLOAD_DIR, f"{item.extraction_id}_prescription_report.docx")
    document.save(output_path)
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{item.extraction_id}_prescription_report.docx",
    )


@router.put("/verify/{extraction_id}")
def verify_extraction(
    extraction_id: str,
    payload: PrescriptionVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verification step: Update/correct extracted fields and mark as VERIFIED by human operator.
    """
    item = db.query(PrescriptionExtraction).filter(PrescriptionExtraction.extraction_id == extraction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Prescription extraction not found")

    item.patient_name = payload.patient_name
    item.prescription_date = payload.prescription_date
    item.doctor_name = payload.doctor_name
    item.doctor_license = payload.doctor_license
    item.medication_name = payload.medication_name
    item.strength = payload.strength
    item.dosage = payload.dosage
    item.frequency = payload.frequency
    item.duration = payload.duration
    item.route = payload.route
    item.instructions = payload.instructions
    item.quantity = payload.quantity
    item.refills = payload.refills
    item.notes = payload.notes
    item.verification_status = "VERIFIED"
    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)

    return {
        "message": f"Prescription {extraction_id} verified and updated",
        "extraction": format_extraction_response(item)
    }


@router.post("/create-case/{extraction_id}")
def create_case_from_extraction(
    extraction_id: str,
    db: Session = Depends(get_db)
):
    """
    Action step: Convert structured prescription into an active RefillCase in RefillFlow.
    """
    item = db.query(PrescriptionExtraction).filter(PrescriptionExtraction.extraction_id == extraction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Prescription extraction not found")

    case_id = generate_case_id(db)

    # Format synthetic pharmacy message based on extracted prescription data
    pharmacy_message = (
        f"AI Prescription Extraction {extraction_id}: "
        f"{item.medication_name or 'Medication'} {item.strength or ''} for {item.patient_name or 'Patient'}. "
        f"Directions: {item.instructions or item.frequency or 'As directed'}. "
        f"Refills remaining: {item.refills or '0'}. Prescriber: {item.doctor_name or 'Provider'}."
    )

    # Simple blocker analysis logic based on refills
    refills_clean = str(item.refills or "0").strip()
    if refills_clean in ["0", "zero", "none"]:
        blocker = "NO_REFILLS_REMAINING"
        status = "PROVIDER_REVIEW"
        owner = "Dr Smith"
        priority = "HIGH"
    else:
        blocker = "MISSING_INFORMATION" if not item.doctor_license else "PROVIDER_REVIEW_REQUIRED"
        status = "PROVIDER_REVIEW"
        owner = "Operations Team"
        priority = "MEDIUM"

    refill_case = RefillCase(
        case_id=case_id,
        patient_name=item.patient_name or "Unknown Patient",
        medication=f"{item.medication_name or 'Unknown Drug'} {item.strength or ''}".strip(),
        status=status,
        blocker=blocker,
        owner=owner,
        priority=priority,
        confidence=item.overall_confidence or 0.95
    )

    db.add(refill_case)

    # Create audit events
    events = [
        AuditEvent(
            case_id=case_id,
            event_type="AI_PRESCRIPTION_UPLOADED",
            description=f"Prescription document {item.file_name} uploaded and extracted via AI Assistant ({extraction_id})",
            actor="AI_PRESCRIPTION_ASSISTANT"
        ),
        AuditEvent(
            case_id=case_id,
            event_type="VERIFIED",
            description=f"Prescription structured data verified: {item.medication_name} ({item.strength}) for {item.patient_name}",
            actor="OPERATIONS_USER"
        ),
        AuditEvent(
            case_id=case_id,
            event_type="CASE_CREATED",
            description=f"Refill case {case_id} generated directly from AI Prescription Intelligence Assistant",
            actor="WORKFLOW_ENGINE"
        )
    ]
    for ev in events:
        db.add(ev)

    item.verification_status = "CONVERTED_TO_CASE"
    item.updated_at = datetime.utcnow()

    db.commit()

    return {
        "message": f"Successfully created Refill Case {case_id} from prescription {extraction_id}",
        "case_id": case_id,
        "extraction_id": extraction_id,
        "status": refill_case.status
    }


@router.get("/file/{filename}")
def serve_prescription_file(filename: str):
    """Serve uploaded prescription image or PDF file."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


def format_extraction_response(item: PrescriptionExtraction) -> dict:
    fc = json.loads(item.field_confidences_json) if item.field_confidences_json else {}
    vf = json.loads(item.verification_flags_json) if item.verification_flags_json else []

    return {
        "extraction_id": item.extraction_id,
        "file_name": item.file_name,
        "file_type": item.file_type,
        "file_path": item.file_path,
        "extracted_data": {
            "patient_name": item.patient_name,
            "prescription_date": item.prescription_date,
            "doctor_name": item.doctor_name,
            "doctor_license": item.doctor_license,
            "medication_name": item.medication_name,
            "strength": item.strength,
            "dosage": item.dosage,
            "frequency": item.frequency,
            "duration": item.duration,
            "route": item.route,
            "instructions": item.instructions,
            "quantity": item.quantity,
            "refills": item.refills,
            "notes": item.notes,
        },
        "overall_confidence": item.overall_confidence or 0.9,
        "field_confidences": fc,
        "verification_flags": vf,
        "verification_status": item.verification_status,
        "raw_text": item.raw_text,
        "created_at": item.created_at.isoformat() if item.created_at else None
    }
