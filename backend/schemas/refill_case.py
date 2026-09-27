from pydantic import BaseModel, Field

class RefillRequest(BaseModel):
    patient_name: str
    medication: str

    pharmacy_message: str = Field(
        min_length=5,
        description="Synthetic pharmacy refill message"
    )
