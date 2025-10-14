from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware # Importante para CORS
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, auth
from .database import engine, get_db

# Crea las tablas en la base de datos (si no existen)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- Configuración de CORS ---
# Permite que tu frontend (ej. desde localhost:5500) se comunique con tu backend.
origins = [
    "http://127.0.0.1:5500", # Origen de tu frontend si usas Live Server
    "http://localhost:5500",
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
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Endpoint para crear un usuario (ej. para un admin o para registro inicial)
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Endpoint protegido para obtener calificaciones
@app.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Un profesor solo ve las notas que él ha puesto
    grades = db.query(models.Grade).filter(models.Grade.professor_id == current_user.id).all()
    return grades

# Endpoint protegido y con rol para crear calificaciones
@app.post("/grades/", response_model=schemas.Grade, status_code=status.HTTP_201_CREATED)
def create_grade(grade: schemas.GradeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.role_required("profesor"))):
    db_grade = models.Grade(**grade.dict(), professor_id=current_user.id)
    db.add(db_grade)
    db.commit()
    db.refresh(db_grade)
    return db_grade

# Ejecutar el servidor
# Abre tu terminal en la carpeta 'backend' y ejecuta: uvicorn main:app --reload