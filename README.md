# KashmirCare Full-Stack Platform (v5 - Permanent Cloud Database Ready)

## 1. Local Run (VS Code)
```bash
npm install
npm start
```
Open `http://localhost:3000`. Locally it automatically uses `file:kashmircare.db`.

## 2. Permanent Online Hosting (Free Forever Setup)

### Step A: Create Free Cloud Database on Turso
1. Go to **turso.tech** and sign in with GitHub (Free tier gives 500 databases & 9GB storage).
2. Click **Create Database**, name it `kashmircare`, and select any region (e.g., Mumbai/Singapore).
3. Click **Generate Token** (Read & Write) and copy:
   - **Database URL** (starts with `libsql://...`)
   - **Auth Token**

### Step B: Deploy on Render.com
1. Push this `kashmircare-app` folder to a GitHub repository.
2. On **Render.com**, click **New + > Web Service** and connect your repo.
3. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL` = *(paste your `libsql://...` URL)*
   - `TURSO_AUTH_TOKEN` = *(paste your token)*
4. Set Build Command: `npm install`, Start Command: `npm start`, Plan: `Free`, and click **Deploy**.

### Step C: Keep Server Awake 24/7 (No 15-min Sleep)
1. Go to **cron-job.org** (free) and create a monitor for `https://your-app-name.onrender.com/api/health` running every **10 minutes**.
