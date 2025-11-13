# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from .roles import UserRole

from . import models, schemas, auth
from .database import engine, get_db

# Crea las tablas en la base de datos (si no existen)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- Configuración de CORS ---
origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    # Añadimos el rol del usuario a los datos del token para que el frontend lo sepa
    token_data = {"sub": user.username, "role": user.role}
    access_token = auth.create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

# Endpoint para crear un usuario (ej. para un admin o para registro inicial)
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    hashed_password = auth.get_password_hash(user.password)
    # Almacenamos el valor del enum (el string) en la base de datos
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role.value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Nuevo endpoint para estudiantes
@app.get("/my-grades/", response_model=List[schemas.Grade])
def read_my_grades(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Asumimos que el student_name en la tabla de notas coincide con el username del estudiante
    if current_user.role != UserRole.ESTUDIANTE.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This endpoint is for students only.")

    grades = db.query(models.Grade).filter(models.Grade.student_name == current_user.username).all()
    return grades

# Endpoint protegido para que un profesor vea las notas que ha puesto
@app.get("/grades/", response_model=List[schemas.Grade])
def read_grades_by_professor(db: Session = Depends(get_db), current_user: models.User = Depends(auth.role_required(UserRole.PROFESOR))):
    grades = db.query(models.Grade).filter(models.Grade.professor_id == current_user.id).all()
    return grades

# Endpoint protegido para crear o actualizar calificaciones (lógica "upsert")
@app.post("/grades/", response_model=schemas.Grade)
def create_or_update_grade(grade: schemas.GradeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.role_required(UserRole.PROFESOR))):
    
    # 1. Buscar si ya existe una calificación para este estudiante y materia
    existing_grade = db.query(models.Grade).filter(
        models.Grade.student_name == grade.student_name,
        models.Grade.subject == grade.subject
    ).first()

    # 2. Si existe, la actualizamos
    if existing_grade:
        # Opcional: Verificar que el profesor que actualiza es el mismo que la creó
        # if existing_grade.professor_id != current_user.id:
        #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this grade")
        existing_grade.score = grade.score
        db.commit()
        db.refresh(existing_grade)
        return existing_grade
    
    # 3. Si no existe, creamos una nueva
    else:
        db_grade = models.Grade(**grade.dict(), professor_id=current_user.id)
        db.add(db_grade)
        db.commit()
        db.refresh(db_grade)
        return db_grade