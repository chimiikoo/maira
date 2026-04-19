
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime



app = FastAPI()

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📁 DB
DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ============ PYDANTIC SCHEMAS (for request/response validation) ============
class BookingCreate(BaseModel):
    name: str
    phone: str
    service: str
    master: str
    start_time: datetime
    end_time: datetime

class BookingUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    service: str | None = None
    master: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None

# ============ SQLALCHEMY MODELS ============
class BookingModel(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    phone = Column(String)
    service = Column(String)
    master = Column(String)

    start_time = Column(DateTime)   # начало
    end_time = Column(DateTime)     # конец

    date_submitted = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ============ API ENDPOINTS ============

@app.get("/api/bookings")
def get_bookings():
    db = SessionLocal()
    bookings = db.query(BookingModel).all()
    db.close()
    return bookings


@app.post("/api/bookings")
def create_booking(booking: BookingCreate):
    db = SessionLocal()
    try:
        # ✓ VALIDATION: Check for slot conflicts
        # Same master + same date + same start_time = conflict
        existing_booking = db.query(BookingModel).filter(
            BookingModel.master == booking.master,
            BookingModel.start_time == booking.start_time
        ).first()
        
        if existing_booking:
            raise HTTPException(
                status_code=409,
                detail=f"This time slot is already booked for {booking.master}. Please choose another time or master."
            )
        
        # ✓ All good - create booking
        db_booking = BookingModel(**booking.dict())
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        return {"id": db_booking.id, "status": "created"}
    finally:
        db.close()


@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: int):
    db = SessionLocal()
    try:
        booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        db.delete(booking)
        db.commit()
        return {"success": True, "message": "Booking deleted"}
    finally:
        db.close()

@app.put("/api/bookings/{booking_id}")
def update_booking(booking_id: int, data: BookingUpdate):
    db = SessionLocal()
    try:
        booking = db.query(BookingModel).filter(BookingModel.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(booking, key, value)

        db.commit()
        return {"success": True, "message": "Booking updated"}
    finally:
        db.close()