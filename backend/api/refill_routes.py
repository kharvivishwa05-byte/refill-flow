from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.db import get_db
from models.refill_case import RefillCase
from models.audit_event import AuditEvent
from schemas.refill_case import RefillRequest
from services.ai_service import analyze_refill_message
from services.workflow_service import WorkflowService
router = APIRouter()
# ---------------------------------------------------------
# Helper: Generate the next readable case ID
# ---------------------------------------------------------
def generate_case_id(db: Session) -> str:
    """
    Generate case IDs such as RF-001, RF-002 and RF-003.
    """
    latest_number = (
        db.query(func.max(RefillCase.id))
        .scalar()
    )
    next_number = (latest_number or 0) + 1
    return f"RF-{next_number:03d}"
# ---------------------------------------------------------
# Create a refill request
# ---------------------------------------------------------
@router.post("/refill-request")
async def create_refill_case(
    request: RefillRequest,
    db: Session = Depends(get_db),
):
    """
    Create a refill case.
    Flow:
    1. Receive the pharmacy message.
    2. Analyze the message using Groq.
    3. Normalize the operational blocker.
    4. Determine the next workflow state.
    5. Save the case.
    6. Save the audit timeline.
    """
    case_id = generate_case_id(db)
    try:
        # Step 1: Analyze synthetic pharmacy message
        analysis = await analyze_refill_message(
            request.pharmacy_message
        )
        # Step 2: Determine workflow state and owner
        workflow = WorkflowService.determine_next_state(
            analysis["blocker"]
        )
        # Step 3: Set priority
        priority = determine_priority(
            blocker=analysis["blocker"],
            confidence=analysis["confidence"],
        )
        # Step 4: Create refill case
        refill_case = RefillCase(
            case_id=case_id,
            patient_name=request.patient_name,
            medication=request.medication,
            status=workflow["status"],
            blocker=analysis["blocker"],
            owner=workflow["owner"],
            priority=priority,
            confidence=analysis["confidence"],
        )
        db.add(refill_case)
        # Step 5: Create audit events
        audit_events = [
            AuditEvent(
                case_id=case_id,
                event_type="REQUEST_RECEIVED",
                description=(
                    "Synthetic pharmacy refill request received"
                ),
                actor="SYSTEM",
            ),
            AuditEvent(
                case_id=case_id,
                event_type="INVESTIGATING",
                description=(
                    "Refill request analysis started"
                ),
                actor="SYSTEM",
            ),
            AuditEvent(
                case_id=case_id,
                event_type="AI_ANALYSIS",
                description=analysis["reason"],
                actor="GROQ",
            ),
            AuditEvent(
                case_id=case_id,
                event_type="BLOCKER_IDENTIFIED",
                description=(
                    f"Operational blocker identified: "
                    f"{analysis['blocker']}"
                ),
                actor="SYSTEM",
            ),
            AuditEvent(
                case_id=case_id,
                event_type=workflow["status"],
                description=(
                    f"Case routed to {workflow['owner']}"
                ),
                actor="WORKFLOW_ENGINE",
            ),
        ]
        for event in audit_events:
            db.add(event)
        db.commit()
        db.refresh(refill_case)
        return {
            "message": "Refill case created successfully",
            "case_id": refill_case.case_id,
            "status": refill_case.status,
            "blocker": refill_case.blocker,
            "owner": refill_case.owner,
            "priority": refill_case.priority,
            "confidence": refill_case.confidence,
            "ai_reason": analysis["reason"],
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create refill case: {str(error)}",
        )
# ---------------------------------------------------------
# Get all refill cases
# ---------------------------------------------------------
@router.get("/cases")
def get_cases(
    db: Session = Depends(get_db),
):
    """
    Return all refill cases for the operations dashboard.
    """
    cases = (
        db.query(RefillCase)
        .order_by(RefillCase.created_at.desc())
        .all()
    )
    return cases
# ---------------------------------------------------------
# Get one refill case
# ---------------------------------------------------------
@router.get("/cases/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Return one refill case by case ID.
    """
    refill_case = (
        db.query(RefillCase)
        .filter(RefillCase.case_id == case_id)
        .first()
    )
    if not refill_case:
        raise HTTPException(
            status_code=404,
            detail="Refill case not found",
        )
    return refill_case
# ---------------------------------------------------------
# Get audit timeline
# ---------------------------------------------------------
@router.get("/audit/{case_id}")
def get_audit(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Return the complete audit timeline for a refill case.
    """
    refill_case = (
        db.query(RefillCase)
        .filter(RefillCase.case_id == case_id)
        .first()
    )
    if not refill_case:
        raise HTTPException(
            status_code=404,
            detail="Refill case not found",
        )
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.case_id == case_id)
        .order_by(AuditEvent.timestamp.asc())
        .all()
    )
    return events
# ---------------------------------------------------------
# Provider approval
# ---------------------------------------------------------
@router.post("/approve/{case_id}")
def approve_case(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Allow an authorized provider to approve a refill case.
    This endpoint includes duplicate-action protection.
    """
    refill_case = (
        db.query(RefillCase)
        .filter(RefillCase.case_id == case_id)
        .first()
    )
    if not refill_case:
        raise HTTPException(
            status_code=404,
            detail="Refill case not found",
        )
    if refill_case.status == "APPROVED":
        return {
            "message": "Case already approved",
            "case_id": case_id,
            "status": refill_case.status,
        }
    if refill_case.status == "RESOLVED":
        raise HTTPException(
            status_code=409,
            detail="Resolved case cannot be approved again",
        )
    if refill_case.status != "PROVIDER_REVIEW":
        raise HTTPException(
            status_code=409,
            detail=(
                "Case is not currently waiting for "
                "provider review"
            ),
        )
    try:
        refill_case.status = "APPROVED"
        refill_case.owner = "Pharmacy System"
        audit_event = AuditEvent(
            case_id=case_id,
            event_type="APPROVED",
            description=(
                "Authorized provider approved the refill request"
            ),
            actor="Dr Smith",
        )
        db.add(audit_event)
        db.commit()
        db.refresh(refill_case)
        return {
            "message": "Case approved successfully",
            "case_id": case_id,
            "status": refill_case.status,
            "owner": refill_case.owner,
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to approve case: {str(error)}",
        )
# ---------------------------------------------------------
# Pharmacy confirmation
# ---------------------------------------------------------
@router.post("/confirm-pharmacy/{case_id}")
def confirm_pharmacy(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Simulate pharmacy confirmation.
    A case becomes resolved only after confirmation.
    """
    refill_case = (
        db.query(RefillCase)
        .filter(RefillCase.case_id == case_id)
        .first()
    )
    if not refill_case:
        raise HTTPException(
            status_code=404,
            detail="Refill case not found",
        )
    if refill_case.status == "RESOLVED":
        return {
            "message": "Case already resolved",
            "case_id": case_id,
            "status": refill_case.status,
        }
    if refill_case.status != "APPROVED":
        raise HTTPException(
            status_code=409,
            detail=(
                "Pharmacy confirmation is allowed only "
                "after provider approval"
            ),
        )
    try:
        refill_case.status = "RESOLVED"
        refill_case.owner = "Completed"
        pharmacy_event = AuditEvent(
            case_id=case_id,
            event_type="PHARMACY_CONFIRMED",
            description=(
                "Pharmacy confirmed receipt and refill processing"
            ),
            actor="PHARMACY_SYSTEM",
        )
        resolved_event = AuditEvent(
            case_id=case_id,
            event_type="RESOLVED",
            description=(
                "Refill workflow completed successfully"
            ),
            actor="WORKFLOW_ENGINE",
        )
        db.add(pharmacy_event)
        db.add(resolved_event)
        db.commit()
        db.refresh(refill_case)
        return {
            "message": "Pharmacy confirmed the refill",
            "case_id": case_id,
            "status": refill_case.status,
            "owner": refill_case.owner,
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to confirm pharmacy action: {str(error)}"
            ),
        )
# ---------------------------------------------------------
# Priority helper
# ---------------------------------------------------------
def determine_priority(
    blocker: str,
    confidence: float,
) -> str:
    """
    Set a simple operational priority.
    This is not a clinical risk score.
    """
    if confidence < 0.70:
        return "HIGH"
    high_priority_blockers = {
        "NO_REFILLS_REMAINING",
        "INSURANCE_DENIAL",
    }
    if blocker in high_priority_blockers:
        return "HIGH"
    if blocker == "UNKNOWN":
        return "MEDIUM"
    return "MEDIUM"