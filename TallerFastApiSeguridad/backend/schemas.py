from pydantic import BaseModel
from pydantic import BaseModel, Field # <-- 1. IMPORTA Field

# Schema para la creación de calificaciones
class GradeCreate(BaseModel):
    student_name: str
    subject: str
    score: float

class Grade(GradeCreate):
    id: int
    professor_id: int

    class Config:
        orm_mode = True

# Schema para la creación y autenticación de usuarios
class UserCreate(BaseModel):
    username: str
    # 2. AÑADE LA VALIDACIÓN
    password: str = Field(..., min_length=8, max_length=70) 
    role: str

class User(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        orm_mode = True

# Schema para el Token JWT
class Token(BaseModel):
    access_token: str
    token_type: str