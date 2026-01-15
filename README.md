# Personal Expense Analysis

**A local-first web application for visualizing and analyzing personal financial data. Built with React, Vite, TailwindCSS, and a powerful local AI Assistant.**

> **Dedication:**
> S/O to my dad, who told me to track my expenses, 10/10 advice that eventually resulted in this app.

## Showcase

<div align="center">
  <p><b>1. Dashboard Overview & AI Assistant</b></p>
  <img src="./images/dashboard_metrics.png" width="90%" />
  <p><i>The mission control of your finances. Featuring a live-updating AI Assistant, daily averages, and behavioral insights.</i></p>
</div>

### ✨ New: AI Assistant Features
- **Hybrid Execution**: Attempts to use a high-performance **FastAPI backend** (native Python) with an automatic fallback to **Pyodide** (Wasm-based Python in the browser) if the server is offline.
- **Live Performance Tracking**: A real-time **"Thinking" timer** shows exactly how long the LLM takes to process, followed by a final execution duration metric.
- **Multilingual Support**: Ask questions in Japanese, Hindi, or English—the assistant now responds in the same language you used.
- **Strict Numerical Accuracy**: Aggressive prompting ensures the LLM never "hallucinates" or rounds transaction figures in its summaries.
- **Externalized Prompts**: Templates are stored in `backend/utils/prompts/` for easy inspection and customization.

### ✨ New: Dashboard Insights
- **Itemized Splurge Breakdown**: The "Biggest Splurge" card now features a **"Details"** toggle, revealing every single transaction that contributed to that peak spending day.
- **Improved Tooltips**: Refined positioning with premium arrow indicators to ensure context is always visible and never clipped.

## Features
- **Advanced Expense Heatmap**: 
    - Toggle between **Magnitude** (amount spent) and **Frequency** (number of transactions).
    - **Year Navigator**: Browse multi-year datasets with a clean, focused UI.
    - **Behavioral Correlation**: Analyzes the relationship between transaction volume and cost.
- **Interactive Dashboard**: Sunburst charts, trend lines with moving averages, and category breakdowns.
- **Insight Cards**: Automatic detection of "Biggest Splurge", "Category Streaks" (with date drill-down), and "Priciest Categories".
- **Local Privacy**: Data is processed entirely in the browser; no file uploads to external servers.
- **Multi-Currency Support**: Native support and locale-aware formatting for **JPY** and **INR**.

## Architecture & Tech Stack
- **Frontend**: React 18, Vite, Framer Motion (Animations), Lucide (Icons).
- **Backend (Analysis)**: FastAPI (Python 3.10+), Pandas, Plotly.
- **Local LLM**: Ollama (supports any model like `llama3`, `qwen2.5`, etc.).
- **In-Browser Python**: Pyodide (for offline/serverless fallback).

## Getting Started

### Prerequisites
- **Node.js**: v18 or higher.
- **Python**: v3.10 or higher (for the analytics backend).
- **Ollama**: Required for AI features. [Download Ollama](https://ollama.com/)

### Installation

1.  **Clone across development**:
    ```bash
    cd javascript_app
    npm install
    ```

2.  **Setup Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

### Running Locally

You can now run both the frontend and backend with a single command:

1.  **Unified Startup**:
    ```bash
    npm run dev:all
    ```
    This starts the Vite frontend and the FastAPI backend concurrently.

2.  **Docker (Recommended)**:
    If you have Docker installed, you can start the entire stack (frontend + backend) using:
    ```bash
    docker-compose up --build
    ```
    The app will be accessible at `http://localhost:5173`.

---

#### Manual Startup (Alternative)

1.  **Start the Backend Server**:
    ```bash
    npm run dev:backend
    # OR: cd backend && uvicorn main:app --reload
    ```

2.  **Start the Frontend**:
    ```bash
    npm run dev:frontend
    # OR: npm run dev
    ```

3.  **Start Ollama**:
    Ensure Ollama is running and you have pulled a model:
    ```bash
    ollama pull qwen2.5-coder:3b
    ```

---

## Data Format & Insights

The application analyzes an **Excel file (.xlsx or .xls)** with the following structure and characteristics.

### 📊 Data Insights (from latest EDA)
- **Total Transactions**: 1,742 (valid expenses)
- **Total Spent**: 6,663,760.00 (JPY/INR)
- **Average Expense**: 3,825.35
- **Median Expense**: 1,064.00
- **Time Range**: October 2023 to January 2026

### 📝 Required Columns
| Column | Description | Example |
| :--- | :--- | :--- |
| **Date** | ISO Date format | `2024-01-01` |
| **Expense** | Numerical amount (no commas) | `550` |
| **remarks** | Detailed description (used for AI search) | `Starbucks coffee` |
| **category** | Raw category tag (e.g., `gym`, `cafe`) | `dining` |
| **onetime** | `1` for rare/one-time purchases | `0` |
| **for others**| `1` if spent on behalf of others | `0` |

---

## 🏗️ Category Mapping System

The app automatically maps **specific categories** (from your Excel) into **broad groups** for higher-level analysis.

### Broad Groups & Distribution
| Group | Description | Color |
| :--- | :--- | :--- |
| **Food** | Groceries, snacks, dining, cafe, combini meal | #99b98b |
| **Fitness** | Gym, supplements, sports gear/events | #d6a7c3 |
| **Housing & Utilities** | Rent, internet, electricity, water bills | #e2c596 |
| **Transportation** | Metro, shinkansen, flights, ride share | #cda180 |
| **Entertainment** | Nomikai, arcade, karaoke, events | #909eb3 |
| **Household & Clothing** | Clothes, household supplies, furniture | #e7d8c4 |
| **Souvenirs/Gifts** | Souvenirs, treats, gifts | #b4aea8 |
| **Miscellaneous** | Personal care, medicines, help, charity | #b3b3cc |
| **Education** | Books, courses, tuition | #6fa8dc |

> [!NOTE]
> You can customize these mappings and colors in `src/utils/categoryMapping.js`.

---

## 🧠 Local AI Assistant (Ollama)

To enable the "**Ask AI Assistant**" feature:

1.  **Pull a Model**:
    ```bash
    ollama pull qwen2.5:3b
    ```

2.  **Start Ollama with CORS support**:
    By default, Ollama only allows local connections. To allow the web app to talk to it:
    ```bash
    OLLAMA_ORIGINS="*" ollama serve
    ```

---

*Note: This project is strictly local-first. Your financial data never leaves your machine.*
