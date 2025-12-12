from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
import logging
import os
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.models.student import Student, Token, LoginResponse
from app.config import settings

# --- Configuration ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Hardcoded Access Codes
UNIVERSITY_ACCESS_CODES = {
    "SCA": "smart2025",
    "MIT": "mitsecure",
    "STAN": "stanfordAI"
}

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
# MODIFIED: auto_error=False to handle missing headers gracefully (for query param fallback)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)
logger = logging.getLogger("auth")
logger.setLevel(logging.INFO)

router = APIRouter()

def get_db_connection():
    conn = sqlite3.connect(settings.DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    if hashed_password and hashed_password.startswith("shared_auth"):
        return True 
    return pwd_context.verify(plain_password, hashed_password)

def _ensure_tables():
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                university TEXT NOT NULL,
                roll_no TEXT NOT NULL,
                full_name TEXT,
                hashed_password TEXT DEFAULT 'shared_auth', 
                is_active INTEGER DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                UNIQUE(university, roll_no)
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS student_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                university TEXT NOT NULL,
                roll_no TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES students(id)
            );
        """)
        try:
            conn.execute("ALTER TABLE students ADD COLUMN is_admin INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        conn.commit()
    finally:
        conn.close()

_ensure_tables()

# --- Helper Functions ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Models ---
class UnifiedLoginRequest(BaseModel):
    university: str
    roll_no: str
    full_name: Optional[str] = None
    password: Optional[str] = None

class StudentVerifyRequest(BaseModel):
    university: str
    roll_no: str

# --- Endpoints ---

@router.post("/verify")
async def verify_student_exists(verify_data: StudentVerifyRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT full_name FROM students WHERE university = ? AND roll_no = ?", 
            (verify_data.university, verify_data.roll_no)
        )
        row = cursor.fetchone()
        if row:
            return {"exists": True, "full_name": row["full_name"]}
        return {"exists": False, "full_name": None}
    finally:
        conn.close()

@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(login_data: UnifiedLoginRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Check if student exists
        cursor.execute(
            "SELECT * FROM students WHERE university = ? AND roll_no = ?", 
            (login_data.university, login_data.roll_no)
        )
        existing_student = cursor.fetchone()
        
        # 2. Registration Logic
        if not existing_student:
             expected_code = UNIVERSITY_ACCESS_CODES.get(login_data.university)
             is_admin_user = 0
             
             # ADMIN BYPASS: Allow creating admin immediately
             if login_data.password == "admin2025":
                 is_admin_user = 1
                 
             # DEMO BYPASS: Allow default student_a without proper university code
             elif login_data.roll_no == "student_a" and login_data.password == "password123":
                 pass
                 
             # Normal Registration Check
             elif not login_data.password or login_data.password != expected_code:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="New registration requires a valid University Access Code.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
             
             cursor.execute(
                "INSERT INTO students (university, roll_no, full_name, hashed_password, is_admin) VALUES (?, ?, ?, ?, ?)",
                (login_data.university, login_data.roll_no, login_data.full_name, "shared_auth_mode", is_admin_user)
            )
             conn.commit()
             cursor.execute(
                "SELECT * FROM students WHERE university = ? AND roll_no = ?", 
                (login_data.university, login_data.roll_no)
            )
             existing_student = cursor.fetchone()

        # 3. Create Session
        session_id = str(uuid4())
        cursor.execute(
            "INSERT INTO user_sessions (session_id, user_id, created_at) VALUES (?, ?, ?)",
            (session_id, existing_student['id'], datetime.utcnow().isoformat())
        )
        conn.commit()

        # 4. Issue Token with Strict Claims
        claims = {
            "sub": str(existing_student['id']),
            "university": existing_student['university'],
            "roll_no": existing_student['roll_no'],
            "is_admin": bool(existing_student['is_admin']),
            "jti": session_id
        }
        
        logger.info(f"LOGIN_ISSUED: {claims}")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data=claims,
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": dict(existing_student)
        }
    finally:
        conn.close()

# MODIFIED: Accepts token from query param or cookie if header is missing
async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> Student:
    # CRITICAL: Allow OPTIONS requests (CORS preflight) to pass through without authentication
    # This prevents CORS errors when browser sends preflight requests
    if request.method == "OPTIONS":
        # Return a dummy user for OPTIONS - it won't be used
        return Student(
            university="SYSTEM",
            roll_no="OPTIONS",
            full_name="CORS Preflight",
            is_admin=False
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    encoded_token = token
    if not encoded_token:
        # Debug print
        print(f"DEBUG AUTH: Header token missing. Checking query params: {request.query_params}")
        encoded_token = request.query_params.get("token")
    if not encoded_token:
        encoded_token = request.cookies.get("access_token")
    
    if not encoded_token:
        print("DEBUG AUTH: No token found in header, query, or cookie.")
        raise credentials_exception
    
    # print(f"DEBUG AUTH: Token found: {encoded_token[:10]}...")
    
    try:
        payload = jwt.decode(encoded_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        university: str = payload.get("university")
        roll_no: str = payload.get("roll_no")
        jti: str = payload.get("jti")
        
        if not user_id_str or not university or not roll_no:
            logger.warning(f"AUTH_MISMATCH: Missing claims in token: {payload}")
            raise credentials_exception
            
    except (JWTError, ValueError):
        raise credentials_exception

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Verify Session
        if jti:
             cursor.execute("SELECT user_id FROM user_sessions WHERE session_id = ?", (jti,))
             session_row = cursor.fetchone()
             if not session_row:
                 logger.warning(f"AUTH_MISMATCH: Session {jti} not found or revoked.")
                 raise credentials_exception
             if str(session_row['user_id']) != user_id_str:
                 logger.warning(f"AUTH_MISMATCH: Session user {session_row['user_id']} != token user {user_id_str}")
                 raise credentials_exception

        # 2. Verify User against DB (Strict Check)
        cursor.execute("SELECT * FROM students WHERE id = ? AND university = ? AND roll_no = ?", (user_id_str, university, roll_no))
        user_row = cursor.fetchone()
        if user_row is None:
            logger.warning(f"AUTH_MISMATCH: User {user_id_str} not found with claims {university}/{roll_no}")
            raise credentials_exception
            
        user_obj = Student(**dict(user_row))
        
        # Override is_admin for the master ADMIN account to ensure access
        if user_obj.roll_no == "ADMIN":
            user_obj.is_admin = True
            
        return user_obj
    finally:
        conn.close()

@router.get("/me", response_model=Student)
async def read_users_me(current_user: Student = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    try:
        # Handle case where token might be None if auto_error=False
        if not token:
            return {"status": "logged_out"}
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if jti:
            conn = get_db_connection()
            try:
                conn.execute("DELETE FROM user_sessions WHERE session_id = ?", (jti,))
                conn.commit()
            finally:
                conn.close()
    except Exception:
        pass 
    return {"status": "logged_out"}

@router.get("/forensic/leaks")
async def forensic_leaks(current_user: Student = Depends(get_current_user)):
    if not current_user.is_admin:
         raise HTTPException(status_code=403, detail="Admin only")
    return {"leaks": []}

@router.post("/setup-test-user")
async def setup_test_user():
    return {"status": "ok"}
