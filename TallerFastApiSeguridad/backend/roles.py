# backend/roles.py
from enum import Enum

class UserRole(str, Enum):
    PROFESOR = "profesor"
    ESTUDIANTE = "estudiante"
    ADMIN = "admin" # Pensemos a futuro