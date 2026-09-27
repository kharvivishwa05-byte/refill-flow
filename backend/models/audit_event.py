from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime
from datetime import datetime
from database.db import Base
class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True)
    case_id = Column(String)
    event_type = Column(String)
    description = Column(String)
    actor = Column(String)
    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )