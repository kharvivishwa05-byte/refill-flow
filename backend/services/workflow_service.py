class WorkflowService:
    @staticmethod
    def determine_next_state(blocker: str) -> dict:
        mapping = {
            "NO_REFILLS_REMAINING": {
                "status": "PROVIDER_REVIEW",
                "owner": "Dr Smith"
            },
            "PROVIDER_REVIEW_REQUIRED": {
                "status": "PROVIDER_REVIEW",
                "owner": "Dr Smith"
            },
            "INSURANCE_DENIAL": {
                "status": "INSURANCE_BLOCKED",
                "owner": "Insurance Team"
            },
            "MISSING_INFORMATION": {
                "status": "MISSING_INFORMATION",
                "owner": "Practice Staff"
            },
            "PHARMACY_CLARIFICATION": {
                "status": "PHARMACY_CLARIFICATION",
                "owner": "Pharmacy Team"
            },
            "UNKNOWN": {
                "status": "MANUAL_REVIEW",
                "owner": "Practice Staff"
            }
        }
        return mapping.get(
            blocker,
            {
                "status": "MANUAL_REVIEW",
                "owner": "Practice Staff"
            }
        )