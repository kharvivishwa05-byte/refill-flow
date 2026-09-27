import json
import os
import httpx
from dotenv import load_dotenv

# Load values from backend/.env
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"
ALLOWED_BLOCKERS = {
    "NO_REFILLS_REMAINING",
    "INSURANCE_DENIAL",
    "MISSING_INFORMATION",
    "PROVIDER_REVIEW_REQUIRED",
    "PHARMACY_CLARIFICATION",
    "UNKNOWN",
}


def fallback_blocker_analysis(pharmacy_message: str) -> dict:
    """Fallback classification used when Groq is unavailable."""
    text = (pharmacy_message or "").lower()

    if any(
        phrase in text
        for phrase in (
            "no refills remain",
            "no refill remaining",
            "no refills left",
            "refills remain",
            "renewal is required",
            "needs renewal",
        )
    ):
        blocker = "NO_REFILLS_REMAINING"
        confidence = 0.9
        reason = "The message indicates the patient has exhausted refill availability and requires a renewal review."
    elif any(
        phrase in text
        for phrase in (
            "insurance",
            "payer",
            "pbm",
            "coverage",
            "prior authorization",
            "authorization",
            "claim",
        )
    ):
        blocker = "INSURANCE_DENIAL"
        confidence = 0.85
        reason = "The message indicates an insurance or benefit issue is preventing refill fulfillment."
    elif any(
        phrase in text
        for phrase in (
            "missing",
            "need more information",
            "requires information",
            "provider details",
            "pharmacy details",
            "medication details",
            "patient information",
        )
    ):
        blocker = "MISSING_INFORMATION"
        confidence = 0.8
        reason = "The request is missing required details needed to process the refill."
    elif any(
        phrase in text
        for phrase in (
            "provider review",
            "clinical review",
            "requires authorization",
            "awaiting physician",
            "provider approval",
            "medical review",
        )
    ):
        blocker = "PROVIDER_REVIEW_REQUIRED"
        confidence = 0.88
        reason = "The refill requires a provider review before the pharmacy can continue."
    elif any(
        phrase in text
        for phrase in (
            "clarification",
            "strength",
            "quantity",
            "directions",
            "prescription detail",
            "pharmacy clarification",
        )
    ):
        blocker = "PHARMACY_CLARIFICATION"
        confidence = 0.8
        reason = "The pharmacy message points to missing prescription detail or clarification before fulfillment."
    else:
        blocker = "UNKNOWN"
        confidence = 0.5
        reason = "The message does not contain enough information to confidently identify the blocker."

    return {
        "blocker": blocker,
        "confidence": confidence,
        "reason": reason,
    }


async def analyze_refill_message(
    pharmacy_message: str
) -> dict:
    """
    Analyze a synthetic pharmacy refill message.
    The LLM only classifies the operational blocker.
    It does not make clinical or prescribing decisions.
    """
    if not pharmacy_message.strip():
        raise ValueError(
            "Pharmacy message cannot be empty"
        )

    if not GROQ_API_KEY:
        return fallback_blocker_analysis(pharmacy_message)

    if not GROQ_MODEL:
        raise ValueError(
            "GROQ_MODEL is missing from the .env file"
        )

    system_prompt = """
You analyze synthetic prescription refill workflow messages.
Your task is limited to identifying the operational reason
that a refill request is blocked.
Return only a valid JSON object with exactly these fields:
{
  "blocker": "ALLOWED_BLOCKER_VALUE",
  "confidence": 0.0,
  "reason": "Short operational explanation"
}
The blocker must be exactly one of these values:
- NO_REFILLS_REMAINING
- INSURANCE_DENIAL
- MISSING_INFORMATION
- PROVIDER_REVIEW_REQUIRED
- PHARMACY_CLARIFICATION
- UNKNOWN
Classification guidance:
- NO_REFILLS_REMAINING:
  The message says there are no refills left, no fills remain,
  or a renewal is required.
- INSURANCE_DENIAL:
  Insurance, payer, PBM, coverage, authorization, or claim
  requirements are blocking fulfillment.
- MISSING_INFORMATION:
  Required patient, medication, provider, pharmacy, or request
  information is missing.
- PROVIDER_REVIEW_REQUIRED:
  The provider must review the patient's condition or the
  request requires clinical review.
- PHARMACY_CLARIFICATION:
  The pharmacy needs clarification about the prescription,
  directions, quantity, strength, or another prescription detail.
- UNKNOWN:
  The message does not contain enough information to safely
  determine the blocker.
The confidence must be a number between 0 and 1.
Do not provide medical advice.
Do not prescribe medication.
Do not recommend medication or dosage changes.
Do not approve or reject a refill.
Do not invent missing information.
"""
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": pharmacy_message,
            },
        ],
        "temperature": 0,
        "response_format": {
            "type": "json_object"
        },
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
    except httpx.TimeoutException:
        return fallback_blocker_analysis(pharmacy_message)
    except httpx.RequestError:
        return fallback_blocker_analysis(pharmacy_message)

    if response.status_code != 200:
        return fallback_blocker_analysis(pharmacy_message)

    try:
        response_data = response.json()
        content = (
            response_data["choices"][0]
            ["message"]["content"]
        )
        analysis = json.loads(content)
    except (
        KeyError,
        IndexError,
        TypeError,
        json.JSONDecodeError,
    ):
        return fallback_blocker_analysis(pharmacy_message)

    blocker = analysis.get("blocker")
    confidence = analysis.get("confidence")
    reason = analysis.get("reason")
    if blocker not in ALLOWED_BLOCKERS:
        raise ValueError(
            f"Groq returned an unsupported blocker: {blocker}"
        )
    try:
        confidence = float(confidence)
    except (TypeError, ValueError) as error:
        raise ValueError(
            "Groq returned an invalid confidence value"
        ) from error
    if confidence < 0 or confidence > 1:
        raise ValueError(
            "Groq confidence must be between 0 and 1"
        )
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError(
            "Groq returned an invalid reason"
        )
    return {
        "blocker": blocker,
        "confidence": confidence,
        "reason": reason.strip(),
    }