# Deploying HireXAI Backend to Render (Free Tier)

This guide provides the **exact** steps to deploy your FastAPI backend to Render's free tier.

## Prerequisite
- Ensure you have pushed your latest code to GitHub.
- Create an account on [Render.com](https://render.com).

## Step 1: Create a New Web Service
1.  On the Render Dashboard, click **New +** -> **Web Service**.
2.  Connect your GitHub repository (`HireXAISleek` or similar).

## Step 2: Service Configuration (CRITICAL)
Fill in the details exactly as follows to match your folder structure:

| Setting | Value | Explanation |
| :--- | :--- | :--- |
| **Name** | `hirexai-backend` | Or any name you like |
| **Region** | (Choose closest to you) | e.g., Singapore, Frankfurt |
| **Branch** | `main` | Or your active branch |
| **Root Directory** | `backend` | **Important:** This tells Render to run commands inside the `backend` folder. |
| **Runtime** | `Python 3` | |
| **Build Command** | `pip install -r requirements.txt` | Since we are in the `backend` folder, we use the local path. |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port 10000` | Starts the app on port 10000. |

## Step 3: Environment Variables
You MUST set these in the **Environment** tab of your Render service.
*Note: Do not wrap values in quotes.*

| Key | Value Source | Description |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures Render uses the correct Python version. |
| `ENVIRONMENT` | `production` | Enables production security settings. |
| `SUPABASE_DB_URL` | Supabase Dashboard | Connection string (Transaction Mode: `postgresql://...`) |
| `BACKEND_CORS_ORIGINS` | `["https://your-frontend-url.vercel.app"]` | **Update this after deploying frontend.** For now, use `["*"]` to test. |
| `SECRET_KEY` | (Generate Random) | e.g., run `openssl rand -hex 32` locally. |
| `GROQ_API_KEY` | Groq Dashboard | For AI features. |
| `GEMINI_API_KEY` | Google AI Studio | For AI features. |
| `JUDGE0_API_KEY` | RapidAPI | For code execution. |
| `SUPABASE_URL` | Supabase Dashboard | Project URL. |
| `SUPABASE_KEY` | Supabase Dashboard | `anon`/`public` key. |
| `TESTS_AES_KEY` | (Generate Random) | Random 32-byte string (base64) for secure tokens. |

## Step 4: Deploy
1.  Click **Create Web Service**.
2.  Render will start building. Watch the logs.
3.  Once "Live", copy the service URL (e.g., `https://hirexai-backend.onrender.com`).

## Step 5: Update Frontend
Once deployed, go to your **Frontend** configuration (Vercel/Local) and update:
- `NEXT_PUBLIC_API_BASE_URL` = `https://hirexai-backend.onrender.com/api/v1` (or just the domain, checking your client code).
  - *Correction*: Your client code appends `/v1` often, check `NEXT_PUBLIC_API_BASE_URL` usage. Usually it is just the domain root or `/api`.
  - In `api-client.ts`, it uses `this.client = axios.create({ baseURL: this.baseURL ... })`.
  - Check `env.local`: If it is `http://localhost:8000`, the client appends nothing. The routes have `/v1/...`.
  - **So set `NEXT_PUBLIC_API_BASE_URL` to `https://hirexai-backend.onrender.com` (no trailing slash).**

---
**Status Check:**
Access `https://hirexai-backend.onrender.com/health` to confirm the server is running.
