# backend/schemas.py
from pydantic import BaseModel, Field
from .roles import UserRole

# Schema para la creación de calificaciones
class GradeCreate(BaseModel):
    student_name: str
    subject: str
    # Añadimos validación: ge=Greater than or Equal, le=Less than or Equal
    score: float = Field(..., ge=0, le=500)

class Grade(GradeCreate):
    id: int
    professor_id: int

    class Config:
        from_attributes = True

# Schema para la creación y autenticación de usuarios
class UserCreate(BaseModel):
    username: str
    password: str = Field(..., min_length=8, max_length=70) 
    role: UserRole

class User(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

# Schema para el Token JWT
class Token(BaseModel):
    access_token: str
    token_type: str