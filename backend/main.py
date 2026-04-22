
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os
import shutil
from pathlib import Path
from typing import Optional

# Admin password
ADMIN_PASSWORD = "lovemaira007"



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

# 📁 Create staff photos directory
STAFF_PHOTOS_DIR = Path("./staff_photos")
STAFF_PHOTOS_DIR.mkdir(exist_ok=True)

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

class StaffCreate(BaseModel):
    name: str
    specialization: str
    phone: str
    email: str
    availability: str

class StaffUpdate(BaseModel):
    name: str | None = None
    specialization: str | None = None
    phone: str | None = None
    email: str | None = None
    availability: str | None = None

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

class StaffModel(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    specialization = Column(String)
    phone = Column(String)
    email = Column(String)
    availability = Column(String)
    photo_filename = Column(String, nullable=True)  # Just filename, not full path
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ============ HELPER FUNCTIONS ============

def verify_admin_password(password: Optional[str] = Header(None)):
    """Verify admin password from header or raise exception"""
    if not password or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid admin password")
    return True

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

# ============ STAFF ENDPOINTS ============

@app.get("/api/staff")
def get_staff():
    db = SessionLocal()
    try:
        staff = db.query(StaffModel).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "specialization": s.specialization,
                "phone": s.phone,
                "email": s.email,
                "availability": s.availability,
                "photo": f"/api/staff-photos/{s.photo_filename}" if s.photo_filename else None
            }
            for s in staff
        ]
    finally:
        db.close()

@app.post("/api/staff")
async def create_staff(
    name: str = Form(...),
    specialization: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    availability: str = Form(...),
    photo: UploadFile = File(None),
    x_admin_password: str = Header(None)
):
    # ✓ Verify admin password
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid admin password")
    
    db = SessionLocal()
    try:
        photo_filename = None
        if photo:
            # Save photo with unique name
            ext = photo.filename.split('.')[-1]
            photo_filename = f"staff_{int(datetime.utcnow().timestamp())}_{name.replace(' ', '_')}.{ext}"
            photo_path = STAFF_PHOTOS_DIR / photo_filename
            
            with open(photo_path, "wb") as f:
                content = await photo.read()
                f.write(content)
        
        new_staff = StaffModel(
            name=name,
            specialization=specialization,
            phone=phone,
            email=email,
            availability=availability,
            photo_filename=photo_filename
        )
        db.add(new_staff)
        db.commit()
        db.refresh(new_staff)
        
        return {
            "id": new_staff.id,
            "name": new_staff.name,
            "specialization": new_staff.specialization,
            "phone": new_staff.phone,
            "email": new_staff.email,
            "availability": new_staff.availability,
            "photo": f"/api/staff-photos/{photo_filename}" if photo_filename else None
        }
    finally:
        db.close()

@app.put("/api/staff/{staff_id}")
async def update_staff(
    staff_id: int,
    name: str = Form(None),
    specialization: str = Form(None),
    phone: str = Form(None),
    email: str = Form(None),
    availability: str = Form(None),
    photo: UploadFile = File(None)
):
    db = SessionLocal()
    try:
        staff = db.query(StaffModel).filter(StaffModel.id == staff_id).first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        if name:
            staff.name = name
        if specialization:
            staff.specialization = specialization
        if phone:
            staff.phone = phone
        if email:
            staff.email = email
        if availability:
            staff.availability = availability
        
        if photo:
            # Delete old photo if exists
            if staff.photo_filename:
                old_photo_path = STAFF_PHOTOS_DIR / staff.photo_filename
                if old_photo_path.exists():
                    old_photo_path.unlink()
            
            # Save new photo
            ext = photo.filename.split('.')[-1]
            photo_filename = f"staff_{int(datetime.utcnow().timestamp())}_{(name or staff.name).replace(' ', '_')}.{ext}"
            photo_path = STAFF_PHOTOS_DIR / photo_filename
            
            with open(photo_path, "wb") as f:
                content = await photo.read()
                f.write(content)
            
            staff.photo_filename = photo_filename
        
        db.commit()
        return {"success": True, "message": "Staff member updated"}
    finally:
        db.close()

@app.delete("/api/staff/{staff_id}")
def delete_staff(staff_id: int):
    db = SessionLocal()
    try:
        staff = db.query(StaffModel).filter(StaffModel.id == staff_id).first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        # Delete photo if exists
        if staff.photo_filename:
            photo_path = STAFF_PHOTOS_DIR / staff.photo_filename
            if photo_path.exists():
                photo_path.unlink()
        
        db.delete(staff)
        db.commit()
        return {"success": True, "message": "Staff member deleted"}
    finally:
        db.close()

# Serve staff photos
app.mount("/api/staff-photos", StaticFiles(directory=str(STAFF_PHOTOS_DIR)), name="staff_photos")