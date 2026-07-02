# <img src="public/hirexai_logo_premium.png" width="45" align="center" alt="HireXAI Logo"/> HireXAI

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.dotjs)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20%2F%20Postgres-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/AI--Engine-Google%20Gemini%20%2F%20Groq-blue?style=flat-square&logo=google-gemini)](https://ai.google.dev/)
[![Judge0](https://img.shields.io/badge/Compiler-Judge0-E34F26?style=flat-square&logo=codeforces)](https://judge0.com/)

**HireXAI** is a state-of-the-art, dual-role recruiting and automated assessment platform. Designed for modern enterprises, it streamlines the hiring lifecycle from semantic candidate search and job creation to automated coding evaluations with comprehensive client-side AI proctoring, culminating in WebRTC-powered collaborative live interviews.

---

## 📖 Table of Contents
- [✨ Core Features](#-core-features)
  - [👤 Candidate Workflow](#-candidate-workflow)
  - [👔 Recruiter Workflow](#-recruiter-workflow)
  - [🎙️ Live Video Interview Workspace](#️-live-video-interview-workspace)
  - [🛡️ State-of-the-Art AI Proctoring Engine](#️-state-of-the-art-ai-proctoring-engine)
- [⚙️ Tech Stack & Integrations](#️-tech-stack--integrations)
- [📊 System Architecture & Workflows](#-system-architecture--workflows)
- [📁 Project Structure](#-project-structure)
- [🚀 Local Installation & Setup](#-local-installation--setup)
  - [🐍 Backend Setup](#-backend-setup)
  - [⚛️ Frontend Setup](#️-frontend-setup)
- [☁️ Deployment Guide](#️-deployment-guide)
- [🔒 Security & GDPR Privacy Compliance](#-security--gdpr-privacy-compliance)

---

## ✨ Core Features

### 👤 Candidate Workflow
- **ATS Resume Doctor:** Candidates upload their resume text and receive an immediate compatibility check. Powered by Google Gemini, the AI grades the resume (0–100), checks ATS compatibility, flags missing keywords, lists strengths/weaknesses, and provides actionable recommendations.
- **Smart Resume Builder:** A multi-step wizard to create professional resumes. Candidates can use the **AI Polish** feature to rewrite summaries and experiences into high-impact, action-verb-oriented bullet points, and instantly export their resume to PDF.
- **Job Matching & Recommendations:** Candidates receive job recommendation scores based on the cosine similarity between their profile embeddings and active job postings.
- **Secure Code Assessments:** Candidates solve coding and MCQ evaluations inside a web-based code editor, submitting solutions directly to a secure sandbox executor.

### 👔 Recruiter Workflow
- **AI Job Description Writer:** Generate comprehensive and industry-standard job descriptions in seconds using natural language prompts.
- **Semantic Candidate Search:** Search the candidate pool using conversational English (e.g., *"React developer with 3+ years experience who knows Docker"*). The backend generates search query embeddings to retrieve 100% complete candidate profiles.
- **Assessment Management:** Build custom coding/MCQ tests. Recruiters specify topics, difficulty levels, and constraints. Coding tests are verified using hidden test cases via the Judge0 sandbox before saving.
- **Test Tracking & Review:** Monitor assessment invitations, track candidates' completion status, grade reports, and view detailed logs of proctoring flags.

### 🎙️ Live Video Interview Workspace
A unified, real-time shared workspace for live interviews powered by **WebSockets** (Socket.IO) and **WebRTC** (SimplePeer):
* **P2P Audio & Video:** Low-latency WebRTC streams between recruiter and candidate.
* **Shared Code Editor:** Collaborative code compilation editor powered by Monaco Editor.
* **Interactive Whiteboard:** Canvas board synced in real-time (`wb_draw`, `wb_clear`) for diagramming.
* **Real-time Chat:** Instant messaging panel inside the interview room.
* **Recruiter Proctoring Stream:** Real-time alert feed displaying any candidate browser or behavioral violations.

---

### 🛡️ State-of-the-Art AI Proctoring Engine
To protect assessment integrity without violating privacy, HireXAI runs client-side verification engines during tests and interviews. **All camera and screen streams are analyzed locally; only text metadata is sent to the database.**

| Proctoring Hook | Detection Mechanism | Severity |
| :--- | :--- | :--- |
| **`useFaceDetection`** | Uses `face-api.js` (Tiny Face Detector) to track face count. Logs when `face_missing` exceeds duration thresholds or flags `multiple_faces` if helpers are in the room. | **Medium to High** |
| **`useLivenessCheck`** | Prompts random challenges (blink detection utilizing Eye Aspect Ratio [EAR] landmarks, looking left/right/up using face displacement matrices $\Delta x, \Delta y$). | **Critical** |
| **`useScreenShareContextLock`** | Enforces screen sharing. Locks the baseline screen resolution, aspect ratio, device pixel ratio, and monitor track label. Detects if a candidate switches sharing from screen to window, plugs in another monitor, or shrinks display size. | **Critical** |
| **`useVMDetection`** | Checks WebGL renderer & vendor strings (identifies SwiftShader, llvmpipe, VMware, VirtualBox, Parallels, QEMU, Hyper-V, etc.). Looks for hardware concurrency anomalies and hypervisor timing jitter. | **High** |
| **`useRemoteDesktopDetection`** | Detects remote assistance tools (TeamViewer, AnyDesk, Chrome RDP) by analyzing mouse teleportation events ($\Delta s > 200\text{px}$ in $\Delta t < 20\text{ms}$), frame rate drops, and input latency. | **Critical** |
| **`useKeystrokeDynamics`** | Builds a baseline typing interval signature in the first 30 seconds of typing. Identifies anomalous rhythm shifts that suggest another user took over the keyboard or a copy-paste injection script occurred. | **Medium** |
| **`useMultiMonitorDetection`** | Queries Chrome's experimental Screen Details API and monitors boundary properties (`window.screenX`, `window.screenY`) to detect secondary displays. | **High** |
| **`useSingleTabEnforcer`** | Hooks browser visibility API and tab focus events, immediately logging tab switches or browser minimization. | **Medium** |
| **`useClipboardMonitor`** | Detects and blocks copy-paste inputs within code inputs during tests. | **Low** |

---

## ⚙️ Tech Stack & Integrations

### Frontend
- **Framework:** Next.js 16 (React 19 App Router)
- **Styling:** Tailwind CSS, Framer Motion (premium animations), Radix UI (accessible primitives), Shadcn/ui components
- **Client State:** Zustand (global store), TanStack React Query v5 (server cache)
- **APIs & WebRTC:** Axios (HTTP), Socket.IO Client, SimplePeer (WebRTC P2P)
- **Browser-Side AI:** `face-api.js` (Webcam computer vision)

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database ORM:** SQLAlchemy with Alembic migrations
- **Communications:** Async Socket.IO ASGI server (`python-socketio`)
- **Logging:** Loguru (structured logging)

### Integrations
- **Database & Storage:** Supabase (PostgreSQL engine & Resume PDF bucket storage)
- **Google Gemini:** `models/text-embedding-004` (768D normalized embeddings for semantic candidate search and job recommendations), Gemini Pro (Resume Doctor parsing)
- **Groq LLM:** Llama-3-70B API (AI Job Description writer, AI resume text polish, coding problem generator)
- **Judge0 CE API:** Code compilation sandbox executing candidate code in isolated virtual processes across python, javascript, cpp, java

---

## 📊 System Architecture & Workflows

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor Recruiter
    participant Frontend as Next.js Web Client
    participant Backend as FastAPI Server
    participant DB as PostgreSQL (Supabase)
    participant AI as Gemini & Groq APIs
    participant Sandbox as Judge0 Compiler

    %% Job Posting & Search
    Recruiter->>Frontend: Write Job Description (Prompt AI)
    Frontend->>Backend: POST /api/v1/recruiter/jobs
    Backend->>AI: Generate Content & Embedding
    Backend->>DB: Save Job + Embedding Vector
    
    Candidate->>Frontend: Search Jobs ("FastAPI developer")
    Frontend->>Backend: POST /api/v1/search/jobs
    Backend->>AI: Generate Query Embedding
    Backend->>DB: Perform Cosine Similarity Search
    DB-->>Backend: Return Matched Jobs
    Backend-->>Frontend: Return Filtered Jobs

    %% Custom Assessment Generation
    Recruiter->>Frontend: Define Test topic ("Algorithms", "Hard")
    Frontend->>Backend: POST /api/v1/recruiter/tests/generate
    Backend->>AI: Generate Coding Problem, Tests & Canonical Solution
    Backend->>Sandbox: Execute Canonical Solution against tests
    Sandbox-->>Backend: Verdict: Passed
    Backend->>DB: Save encrypted test questions & testcases (AES-256)

    %% Test Taking and Proctoring
    Candidate->>Frontend: Open Assigned Test
    Frontend->>Backend: websocket: join_room (auth token)
    Frontend->>Frontend: Initialize useFaceDetection & useVMDetection
    loop Real-time Assessment
        Candidate->>Frontend: Write & Run Code
        Frontend->>Backend: POST /api/v1/candidate/assignments/execute
        Backend->>Sandbox: Run candidate code
        Sandbox-->>Backend: Return Stdout/Stderr/Verdict
        Backend-->>Frontend: Display output to Candidate
        
        Note over Frontend, Backend: Proctoring Violation Detected (e.g. Tab Switch)
        Frontend->>Backend: websocket: proctor_event (metadata only)
        Backend->>DB: Save record to proctor_logs
        Backend->>Recruiter: websocket: broadcast alert stream
    end

    %% Live Interview
    Recruiter->>Frontend: Start Scheduled Live Room
    Candidate->>Frontend: Join Scheduled Live Room
    Frontend->>Backend: websocket: join_room (handshake init)
    Backend-->>Frontend: Relay WebRTC Offer / Answer (ICE candidates)
    Frontend->>Frontend: Establish WebRTC P2P Video Call
    Frontend->>Frontend: Synchronize Shared Monaco Editor & Whiteboard
```

---

## 📁 Project Structure

```
HireXAISleek/
├── app/                      # Next.js App Router (Frontend Pages)
│   ├── admin/                # Admin Panel
│   ├── candidate/            # Candidate Dashboards (Resume, Test, Live Interview)
│   │   ├── assignments/      # Coding/MCQ Assessments list
│   │   ├── builder/          # AI Resume Builder
│   │   ├── interview/        # Webcam-proctored interview room
│   │   └── test/             # Code compiler testing environment
│   └── recruiter/            # Recruiter Dashboards
│       ├── interview/        # Interview Scheduler & monitor dashboard
│       └── tests/            # Test builder (AI Gen & template management)
├── components/               # React UI Components
│   ├── interview/            # Live video, whiteboard, collaborative editor components
│   ├── resume-builder/       # Wizard multi-step form & templates
│   └── ui/                   # Reusable Shadcn UI Primitives
├── hooks/                    # Custom React Hooks (State, WebRTC & Proctoring Engines)
│   ├── useFaceDetection.ts   # Client-side face tracker
│   ├── useLivenessCheck.ts   # EAR blink & head movement prompts
│   ├── useVMDetection.ts     # Anti-VM WebGL/timing audits
│   ├── useWebRTC.ts          # SimplePeer connection lifecycle
│   └── ...                   # RDP, Keystroke, Multi-Monitor hooks
├── lib/                      # Configuration & Shared Utilities
│   ├── api/                  # Modular Axios API Services (Auth, Tests, Jobs)
│   └── api-client.ts         # Consolidated Client Singleton
├── backend/                  # FastAPI Application (Backend Service)
│   ├── api/                  # REST Routers & Endpoints
│   │   ├── v1/               # candidate, recruiter, interview routes
│   │   └── routers/          # assignments, proctoring, test routers
│   ├── core/                 # Database, Security, Logs, Config Settings
│   ├── models/               # SQLAlchemy Database Models
│   ├── services/             # Core Services (LLM, Vector similarity, Judge0, Storage)
│   ├── main.py               # Main FastAPI & Socket.IO Entry wrapper
│   └── run_server.py         # Local development startup script
├── render.yaml               # Infrastructure-as-code config for Render
└── package.json              # Next.js Project Dependencies
```

---

## 🚀 Local Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/HireXAISleek.git
   cd HireXAISleek
   ```

### 🐍 Backend Setup


1. **Activate Virtual Environment:**
   Open PowerShell in the workspace root and run the activation script:
   ```powershell
   # Activate local .venv
   & d:/HireXAISleek/.venv/Scripts/Activate.ps1
   ```

2. **Install Dependencies:**
   Ensure you are in the `backend` folder and install Python packages:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`backend/.env`):**
   Create a `.env` file inside the `backend/` directory:
   ```ini
   ENVIRONMENT=development
   DATABASE_URL=sqlite:///./hirexai.db
   SECRET_KEY=generate_your_secret_key_here
   TESTS_AES_KEY=generate_32_byte_base64_aes_key
   
   # AI Services Keys
   GEMINI_API_KEY=your_google_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   
   # Compiler Integration
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_rapid_api_key_for_judge0
   
   # Storage Integration (Supabase)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-public-anon-key
   SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
   ```

4. **Run Server:**
   Launch the FastAPI application:
   ```bash
   python run_server.py
   ```
   *The server runs on `http://localhost:8000`. You can inspect the interactive OpenAPI documentation at `http://localhost:8000/api/v1/docs`.*

---

### ⚛️ Frontend Setup

1. **Configure Environment Variables (`.env.local`):**
   Create a `.env.local` file in the root folder of the project:
   ```ini
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   ```

2. **Install Node Packages:**
   Ensure you are in the project root directory:
   ```bash
   npm install
   ```

3. **Run Next.js Dev Server:**
   ```bash
   npm run dev
   ```
   *Open `http://localhost:3000` to view the web application. Log in with candidate or recruiter credentials.*

---

## ☁️ Deployment Guide

### Deploying Backend to Render (Free Tier)
We provide a pre-configured `render.yaml` configuration to deploy the backend automatically.

1. Create an account on [Render.com](https://render.com).
2. Connect your GitHub repository.
3. Click **New +** -> **Blueprints** and select your repository. Render will automatically parse the `render.yaml` template.
4. Fill in the required environment variables (`GEMINI_API_KEY`, `GROQ_API_KEY`, `JUDGE0_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, etc.) inside the Render Dashboard environment settings.
5. Once deployment is complete, note down your web service URL (e.g. `https://hirexai-backend.onrender.com`).

### Deploying Frontend to Vercel
1. Create an account on [Vercel.com](https://vercel.com).
2. Create a new project and import your repository.
3. Set the build directory to root.
4. Set the Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://hirexai-backend.onrender.com/api`
5. Click **Deploy**.

---

## 🔒 Security & GDPR Privacy Compliance
* **Data Encryption:** Test problem descriptions, function signatures, and hidden test inputs are encrypted at rest using AES-256. They are only decrypted temporarily when rendering a test or executing code runs.
* **Privacy-First Proctoring:** Standard proctoring systems violate privacy by recording video streams and storing webcam screenshots. HireXAI performs all facial detection, liveness validations, and RDP analysis *locally in the user's browser*. 
* **Zero Image Storage:** The Socket.IO server automatically intercepts and strips any incoming binary data or base64 screenshots (`image`, `snapshot`, `buffer`, etc.) before forwarding or saving logs. Only metadata descriptors (e.g., event: `face_missing`, timestamp: `2026-07-02T12:00:00Z`) are stored in `ProctorLog`.
* **CORS Whitelisting:** Environment-based configurations ensure that CORS restrictions are strictly enforced in production, while permitting development tools (e.g., ngrok tunnels) in development.
