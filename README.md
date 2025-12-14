# Smart Campus Assistant (SCA)

A comprehensive AI-powered platform for students and administrators, featuring document management, interactive chat, quizzes, and analytics.

## 🚀 Features

- **Document Management**: Upload and organize PDF/Text documents (up to 200MB).
- **AI Chat**: Ask questions about your documents using RAG (Retrieval-Augmented Generation).
- **Quiz System**: Generate adaptive quizzes based on your study material.
- **Analytics**: Track learning progress and engagement.
- **Admin Dashboard**: User management and system performance monitoring.
- **Secure Authentication**: Role-based access control (Student vs. Admin).
- **Dark Mode UI**: Modern, responsive interface.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Python, FastAPI, ChromaDB (Vector Store)
- **AI/LLM**:(Multi-Provider Support)

OpenAI(Must)
Groq
Wikipedia(Must)
Ollama (Local LLMs)

⚠️ IMPORTANT:
To get the best and uninterrupted experience, it is strongly recommended to configure all four providers (OpenAI, Groq, Wikipedia, Ollama).
If one provider fails or hits rate limits, the system can gracefully fall back to another.

## 📋 Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- Git
- (Optional but Recommended) Ollama installed locally

## 🔧 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Dharani-VK/SCA_Dharani-VK.git
cd SCA_Dharani-VK
```

### 2. Environment Configuration
**CRITICAL:** You must set up your API keys for the AI features to work.

1. Create a `.env` file in the root directory (or copy `.env.example`).
2. Add your OpenAI API key:
   # =========================
# AI PROVIDERS (MANDATORY)
# =========================

# OpenAI (Primary Cloud LLM)
OPENAI_API_KEY=sk-your-openai-key

# Groq (Fast, Free-tier friendly)
GROQ_API_KEY=your-groq-api-key

# Wikipedia (No API key required, keep enabled)
WIKI_ENABLED=true

# Ollama (Local LLM Fallback)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# =========================
# DATABASE
# =========================
DATABASE_URL=sqlite:///./sql_app.db


### 3. Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
# Windows:
..\.venv\Scripts\activate
# Linux/Mac:
# source ../.venv/bin/activate
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

## ▶️ Running the Application

We provide a convenient script to start all services (Backend + Frontend) automatically.

**Windows:**
Double-click `restart_everything.bat` 
OR run in terminal:
```bash
.\restart_everything.bat
```

This will:
1. Stop any existing server processes.
2. Start the Backend server (http://127.0.0.1:8000).
3. Start the Frontend dev server (http://localhost:5173).

## ✅ Verification & Testing

To ensure the system is running correctly, you can use the included verification scripts.

### 1. Check API Health
You can access the automatic API documentation to test endpoints manually:
- Open browser: http://127.0.0.1:8000/docs
- Or use curl:
  ```bash
  curl -v http://127.0.0.1:8000/docs
  ```

### 2. Check Database Connectivity
Verifies that the SQLite database is accessible and lists recent users.
```bash
python check_db.py
```

### 3. Verify Student Flow
Runs an automated test script to simulate a student login and navigation flow to ensure core features are working.
```bash
python verify_student_flow.py
```

## 👤 Default Credentials

- **Admin User**: `ADMIN` / `admin2025`
- **Test Student**: `test_student` / `password123` (or register a new account)


## Debugging & Fix Workflow (Documented)
🔍 Diagnosis Phase
python backend/reproduce_upload_error.py


Purpose:

Reproduce backend errors in terminal

Reveal hidden issues (e.g., no such table: documents)

Save output:

python backend/reproduce_upload_error.py > backend/repro_output.txt

🛠️ Fix Phase
python backend/init_db_manual.py


Purpose:

Force-create missing database tables

Resolve upload & ingestion failures

⚠️ Ensure this script is run from the correct project root.

## ✅ Verification Phase
python backend/reproduce_upload_error.py


Expected:

Status Code: 200

Confirm tables:

python backend/check_tables_debug.py

🌐 Wikipedia Ingestion Verification
python backend/test_wiki_ingest.py


Purpose:

Verify Wikipedia import works independently

Confirms successful ingestion (Status: 200)

🧹 Cleanup Phase

Remove temporary debug scripts:

del backend\reproduce_upload_error.py
del backend\test_wiki_ingest.py



