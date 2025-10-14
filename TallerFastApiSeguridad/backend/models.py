from sqlalchemy import Column, Integer, String, Float, ForeignKey
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(50)) # Ej: "profesor", "admin"

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String(100))
    subject = Column(String(100))
    score = Column(Float)
    professor_id = Column(Integer, ForeignKey("users.id"))