# AI Project Context: Soryouth CRM

This document serves as a guide for any AI assistant or developer to quickly understand the architecture, tech stack, and key workflows of the Soryouth CRM project.

## 1. Project Overview & Tech Stack
**Soryouth CRM** is a modern full-stack web application designed for solar business management (leads, proposals, documents).
- **Framework**: Next.js 15 (using the `app/` directory router)
- **Language**: TypeScript (`.ts`, `.tsx`)
- **Styling**: Tailwind CSS + Shadcn-UI (Radix UI components)
- **Database / ORM**: Prisma ORM
- **Authentication / AI**: Firebase (Admin & Genkit)
- **Storage**: AWS S3 (via `@aws-sdk/client-s3`)
- **Charts / Document Generation**: Recharts (Frontend), `docxtemplater`, Python (Backend microservice)

## 2. Directory Structure
- `app/`: Contains all Next.js frontend pages, layouts, and API routes.
  - `app/(app)/`: Authenticated CRM interface (dashboard, clients, proposals).
  - `app/api/`: Backend API routes.
- `components/`: Reusable React/Tailwind UI components.
- `lib/`: Core utilities (S3 upload handlers, Prisma client initialization, authentication helpers, financial calculation constants).
- `prisma/`: Database schema (`schema.prisma`) and seed scripts.
- `microservices/`: Independent backend services. 
  - `proposal_generator/`: A Flask-based Python microservice responsible for advanced document manipulation.
- `soryouth-dialer/`: An associated module/app for calling and dialing functionality.
- `scratch/` & root Python scripts: Utility scripts for database backups, data recovery, and block generation.

## 3. Key Workflows

### A. Proposal Generation (Complex Multi-Step Workflow)
The proposal generation system is one of the most complex parts of the CRM. It involves both the Next.js server and a separate Python microservice.
1. **Trigger**: User initiates generation from the frontend; data hits `app/api/proposals/generate/route.ts`.
2. **Next.js Pre-processing**:
   - The API fetches a base `.docx` template from AWS S3.
   - Calculates financial metrics: Accelerated Depreciation (AD) benefits (using Indian IT Act Sec 32, 80% solar AD), GST, O&M costs, ROI, and Payback Period.
   - Formats values into Indian Rupees (`en-IN`).
3. **Python Microservice (`microservices/proposal_generator/main.py`)**:
   - Next.js sends the `.docx` path and JSON payload to the Python Flask app (usually on port 5001).
   - Python uses `docxtpl` to replace text placeholders (e.g., `{{capacity}}`).
   - Uses `matplotlib` to generate a 3D-styled **Monthly Generation Bar Chart** and a **30-year Yearly Savings Line Chart**.
   - Dynamically builds an HTML table for a 25-year Capex Evaluation Sheet, uses `Html2Image` to screenshot it, and embeds it into the `.docx`.
   - Converts the finalized `.docx` into `.pdf` using MS Word COM automation (`docx2pdf`).
4. **Finalization**: Next.js receives base64 strings of the generated `.docx` and `.pdf`, uploads both to AWS S3, and returns the S3 URLs to the client.

### B. Database Backups & Verification
The project utilizes automated Python scripts (e.g., `check_extracted_db.py`, `recover_deleted_db.py`, `restore_from_git.py`) located in the root to handle database integrity checks, extractions, and disaster recovery.

## 4. AI Assistant Guidelines
When assisting with this project, the AI should:
- Respect the App Router (`app/`) conventions of Next.js 15.
- Keep server actions (`"use server"`) in `actions.ts` files and client components (`"use client"`) isolated.
- Avoid modifying the python generator `generate_blocks.py` if trying to fix proposal outputs (that is just a placeholder testing script). Modify `microservices/proposal_generator/main.py` or the Next.js API route instead.
- Use `lib/prisma.ts` for database calls.

---

## 5. Proposal Generation: Complete Calculation Guide

This section breaks down **every single mathematical formula, assumption, and constant** currently used across the Soryouth CRM to generate a proposal. This is vital context for any AI assistant tasked with upgrading or modifying the calculations.

### Part 1: Next.js API Formulas
**Source File:** `app/api/proposals/generate/route.ts`

**1. Basic Costs & Taxation**
- **Cost per kW**: `ratePerWatt * 1000`
- **Total GST Amount**: `cgstAmount + sgstAmount`
- **Net Investment (After Subsidy)**: `finalAmount - subsidyAmount`

**2. Accelerated Depreciation (AD) Benefits**
The system calculates AD over 3 years based on Indian IT Act Section 32, assuming an 80% depreciation rate for solar assets and a 25% corporate tax rate.
- `AD_DEP_RATE = 0.80`
- `TAX_RATE = 0.25`
- **Initial WDV (Written Down Value)** = `baseAmount` (Project cost excluding GST)

*Year 1 (Half-Year Convention):*
- Depreciation Year 1 (`dep1`): `WDV * (0.80 / 2)` = 40% depreciation.
- **AD Benefit Year 1 (`adBenY1`)**: `dep1 * 0.25`
- Remaining WDV Y1 (`wdv1`): `WDV - dep1`

*Year 2:*
- Depreciation Year 2 (`dep2`): `wdv1 * 0.80`
- **AD Benefit Year 2 (`adBenY2`)**: `dep2 * 0.25`
- Remaining WDV Y2 (`wdv2`): `wdv1 - dep2`

*Year 3:*
- Depreciation Year 3 (`dep3`): `wdv2 * 0.80`
- **AD Benefit Year 3 (`adBenY3`)**: `dep3 * 0.25`

**Total AD Benefit**: `adBenY1 + adBenY2 + adBenY3`

**3. Operations & Maintenance (O&M) Cost**
- **O&M Rate**: Fixed at `₹750 per kW` per year.
- **Total O&M Base Cost**: `capacity (kW) * 750`
- **O&M Escalation**: Assumed as `3%` increase per year.

**4. Return on Investment (ROI)**
- **Net Investment (Final Cost)**: `Net Amount After Subsidy - Total AD Benefit`
- **ROI in Years (Payback Period)**: `Net Investment / Annual Savings` 
- **Cost via Grid (Lifetime estimate)**: `Annual Savings * 25 years`

### Part 2: Python Microservice Formulas
**Source File:** `microservices/proposal_generator/main.py`

**1. Monthly Generation Chart (Bar Chart)**
The Python generator builds the 3D bar chart by multiplying a base daily generation rate by seasonal weather factors.
- **Base Daily Generation**: `capacity (kW) * 4 units` (Assumes 4 kWh per 1 kW system per day).
- **Monthly Formula**: `(Base Daily Generation) * (Days in Month) * (Seasonal Factor)`

*Seasonal Factors by Month:*
- Jan: `0.95` | Feb: `0.97` | Mar: `1.10` | Apr: `1.13` | May: `1.14` | Jun: `0.93`
- Jul: `0.75` | Aug: `0.79` | Sep: `0.87` | Oct: `1.02` | Nov: `1.00` | Dec: `0.99`

**2. Yearly Savings Chart (30-Year Line Chart)**
This chart plots the savings trajectory over 30 years with specific degradation and inflation metrics.
- **Year 1 Base Generation**: `capacity * 4 * 365`
- **Panel Degradation Factor**: `0.996` (Meaning generation drops by **0.4% every year**).
- **Grid Tariff Escalation**: `1.02` (Meaning electricity grid rate increases by **2% every year**).
- **Savings for Year [y]**: `(Generation_y) * (Grid Rate_y)`

**3. 25-Year Capex Evaluation Sheet (HTML Table screenshot)**
This generates the highly detailed table. It falls back to calculating values if the API didn't provide them.
- **Fallback Generation**: If not provided, it calculates `capacity * 4 * 345` (Assuming 345 sunny days).
- **Fallback GST**: If not provided, it assumes `9%` GST (`base_amount * 1.09`).

*Year-by-Year Loop (Years 1 to 25):*
For every year `y` (1 to 25):
- **Annual Generation (`gen`)**: `Base Annual Generation * (0.994 ^ (y-1))` (Applies a **0.60%** degradation rate year-on-year).
- **Cost via Grid (`grid`)**: `gen * unit_rate` *(Note: Grid rate is kept flat here; there is no 2% escalation like in the line chart).*
- **O&M Cost (`om`)**: 
  - Year 1: `0`
  - Year 2+: `Base O&M Cost (capacity * 750) * (1.03 ^ (y-2))` (Applies a **3% escalation** per year).
- **AD Benefit (`ad`)**: Inserts Y1, Y2, Y3 benefits calculated earlier, `0` for subsequent years.
- **Net Savings (`sav`)**: `grid + ad - om`

At the bottom of the table, it simply runs a `sum()` for Generation, Grid Cost, O&M, AD, and Net Savings to give the 25-year totals.
