from pydantic import BaseModel
from datetime import datetime

class BookingCreate(BaseModel):
    name: str
    phone: str
    service: str
    master: str
    start_time: datetime
    end_time: datetime