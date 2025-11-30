# HireXAI Deployment Guide

This guide details the steps to deploy the HireXAI application to production using Vercel (Frontend) and Render (Backend) with Supabase (Database).

## Prerequisites

- GitHub Repository with the latest code.
- Vercel Account.
- Render Account.
- Supabase Project.

## 1. Database Setup (Supabase)

1.  **Create a Project**: Log in to Supabase and create a new project.
2.  **Get Credentials**: Go to Project Settings > Database and copy the **Connection String (URI)**.
    -   Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
    -   **Important**: Replace `[YOUR-PASSWORD]` with your actual database password.

## 2. Backend Deployment (Render)

1.  **Create Web Service**:
    -   Connect your GitHub repo.
    -   Select the `backend` directory as the Root Directory (if possible, otherwise set Build Context to root).
    -   **Runtime**: Python 3
    -   **Build Command**: `pip install -r backend/requirements.txt`
    -   **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port 10000`

2.  **Environment Variables**:
    Add the following environment variables in Render:
    -   `PYTHON_VERSION`: `3.11.0`
    -   `SUPABASE_DB_URL`: (Your Supabase Connection String)
    -   `BACKEND_CORS_ORIGINS`: `["https://your-vercel-app.vercel.app"]` (Add your Vercel URL once deployed)
    -   `SECRET_KEY`: (Generate a strong random string)
    -   `GEMINI_API_KEY`: (Your Gemini API Key)
    -   `GROQ_API_KEY`: (Your Groq API Key, if used)

3.  **Deploy**: Click "Create Web Service". Wait for the build to finish.
4.  **Copy URL**: Once live, copy the backend URL (e.g., `https://hirexai-backend.onrender.com`).

## 3. Frontend Deployment (Vercel)

1.  **Import Project**:
    -   Go to Vercel Dashboard > Add New > Project.
    -   Import your GitHub repository.

2.  **Configure Project**:
    -   **Framework Preset**: Next.js
    -   **Root Directory**: `.` (Root)

3.  **Environment Variables**:
    Add the following environment variables in Vercel:
    -   `NEXT_PUBLIC_API_BASE_URL`: (Your Render Backend URL, e.g., `https://hirexai-backend.onrender.com/api/v1`)
        -   **Note**: Ensure you append `/api/v1` to the URL.

4.  **Deploy**: Click "Deploy".

## 4. Final Configuration

1.  **Update CORS**:
    -   Go back to Render Dashboard > Environment.
    -   Update `BACKEND_CORS_ORIGINS` to include your new Vercel domain (e.g., `["https://hirexai-frontend.vercel.app"]`).
    -   Redeploy the backend (Manual Deploy > Clear build cache & deploy if needed).

2.  **Verify**:
    -   Open your Vercel app.
    -   Try logging in or registering.
    -   Check the browser console for any CORS errors if things fail.

## Troubleshooting

-   **Build Fails**: Check the logs. Common issues are missing dependencies in `requirements.txt` or `package.json`.
-   **CORS Errors**: Ensure the Vercel domain is exactly matched in `BACKEND_CORS_ORIGINS` (no trailing slash).
-   **Database Connection**: Verify the `SUPABASE_DB_URL` is correct and the password is valid.
