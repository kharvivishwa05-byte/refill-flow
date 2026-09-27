from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Float
from sqlalchemy import DateTime
from datetime import datetime
from database.db import Base
class RefillCase(Base):
    __tablename__ = "refill_cases"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True)
    patient_name = Column(String)
    medication = Column(String)
    status = Column(String)
    blocker = Column(String)
    owner = Column(String)
    priority = Column(String)
    confidence = Column(Float)
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow
    )