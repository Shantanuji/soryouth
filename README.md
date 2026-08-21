# ☀️ Soryouth CRM

Enterprise Solar EPC, Rooftop Solar Management & Customer Relationship Management (CRM) Platform.

---

## 🚀 Quick Start for Windows Users (1-Click Launchers)

If you are on Windows, we provide automated batch scripts so you don't have to configure commands manually:

### Step 1: Initial Setup (First Time Only)
Double-click:
```bat
setup.bat
```
*Checks Node.js, creates `.env` from `.env.example`, installs npm packages, initializes Prisma database, and creates the default Super Admin user.*

### Step 2: Start Development Server
Double-click:
```bat
start-dev.bat
```
*Generates Prisma client, boots the Next.js server on **port 9002**, and opens your browser to [http://localhost:9002](http://localhost:9002).*

### (Optional) Launch Full Suite (Web + Proposal Generator Microservice)
Double-click:
```bat
start-all.bat
```
*Starts both the Next.js CRM (`http://localhost:9002`) and the Python Document Generator microservice (`http://127.0.0.1:5001`).*

---

## 💻 Manual CLI Setup (Terminal / PowerShell / CMD)

If you prefer running commands in your terminal:

### 1. Prerequisites
- **Node.js**: v18.x, v20.x, or v22+ ([Download Node.js](https://nodejs.org/))
- **Python** (Optional, for document generator): v3.10+ ([Download Python](https://www.python.org/))

### 2. PowerShell Script Execution Note (Windows)
If PowerShell gives you an error like:
> `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled on this system.`

Run this once in PowerShell:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
*(Or use `cmd.exe` / double-click `start-dev.bat` which bypasses this restriction).*

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
```bash
# Copy example env file if .env doesn't exist
copy .env.example .env
```

### 5. Generate Prisma Client & Push DB
```bash
npx prisma generate
npx prisma db push
node seed-admin.js
```

### 6. Run Next.js Development Server
```bash
npm run dev
```
Open **[http://localhost:9002](http://localhost:9002)** in your browser.

---

## 🔑 Default Super Admin Login Credentials

| Attribute | Value |
| :--- | :--- |
| **Email** | `admin@soryouth.com` |
| **Password** | `adminpassword123` |
| **Role** | `Admin` / `SuperAdmin` |

---

## 📦 Ports & Services Summary

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Next.js CRM Web App** | `http://localhost:9002` | Main CRM Dashboard, Leads, Deals, Surveys, HRMS |
| **Proposal Generator** | `http://127.0.0.1:5001` | Python Flask DOCX/PDF rendering engine |

---

## 📜 Available NPM Scripts

- `npm run dev`: Runs Next.js development server on port 9002
- `npm run dev:turbo`: Runs Next.js with Turbopack on port 9002
- `npm run build`: Compiles production build
- `npm run start`: Runs compiled production build
- `npm run typecheck`: Runs TypeScript compiler check (`tsc --noEmit`)
