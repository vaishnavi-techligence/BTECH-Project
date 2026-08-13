# SmartApply - Executive Career Intelligence Studio

Welcome to **SmartApply**, a production-grade, research-backed AI Job Application Automation System. Designed as a comprehensive B.Tech final-year engineering project (2025-2026), this suite automates the tedious processes of job hunting, candidate alignment, resume tailoring, and form submission.

This system is built from the ground up to feature **10 academic innovations**, zero hardware dependencies (thanks to resilient high-fidelity fallbacks), and a premium glassmorphic user interface. 

---

## 🏗️ Complete Technology Stack

SmartApply is architected using a modern, lightweight, and highly performant stack. Every component is chosen to minimize bloat while maximizing capability.

### 1. Backend API & Server
* **FastAPI**: The core backend framework, chosen for its extreme speed (built on Starlette) and native async support. It handles all HTTP routing, RESTful endpoints, and file uploads.
* **Uvicorn**: An ASGI web server implementation used to run the FastAPI application efficiently.
* **Pydantic**: Used for strict data validation and schema definitions for all API requests and responses.
* **Python 3.10+**: The core programming language powering the entire backend logic.

### 2. Database Layer
* **SQLite (via `sqlite3`)**: A lightweight, serverless relational database. Used to store job application states, prompt tracking metrics, career mobility logs, and session cookies. No external database server setup is required.

### 3. AI & Machine Learning Module
* **Sentence-Transformers (`all-MiniLM-L6-v2`)**: A highly efficient Hugging Face model used locally to convert resumes and job descriptions into high-dimensional vector embeddings. This powers our semantic matching engine without needing paid OpenAI APIs.
* **NumPy**: The mathematical backbone of the system. Used extensively for fast vector operations, calculating **Cosine Similarity** between text embeddings, and computing covariance matrices for intrinsic dimensionality (evaluating AI vs. human text).
* **Local LLM Integration (Ollama)**: Seamlessly integrates with local instances of Llama 3 or Mistral for deep reasoning, resume anonymization, and cover letter generation. If an LLM is unavailable, the system safely falls back to deterministic, high-fidelity mock generators.

### 4. Web Scraping & Data Extraction
* **BeautifulSoup4 (bs4)**: Used for robust HTML parsing and traversal when scraping public career pages and parsing XML/RSS feeds.
* **Requests**: The core HTTP library for interacting with external job boards.
* **Concurrent.Futures**: Implements `ThreadPoolExecutor` for asynchronous, multi-threaded fetching of multiple job RSS feeds concurrently, dramatically reducing search latency.
* **Bot Evasion**: Features exponential backoff logic and rotating User-Agents to bypass basic WAFs (Web Application Firewalls) during data extraction.

### 5. Browser Automation (The Applier Bot)
* **Playwright (`playwright.sync_api`)**: Drives actual Chromium browser instances to navigate external company job portals, locate input fields (Name, Email, Resume, Cover Letter), and submit applications autonomously.
* **Advanced Evasion Tactics**: The Playwright engine is augmented with randomized viewport geometries, human-like typing jitter (randomized `time.sleep` delays), and JavaScript injection to mask the `navigator.webdriver` property.

### 6. Document Processing
* **pdfplumber**: Used for precision text extraction from candidate PDF resumes.
* **python-docx**: Allows parsing and manipulating Microsoft Word `.docx` files.
* **Custom Generators**: Used dynamically for assembling job-tailored resumes based on missing skill alignment.

### 7. Frontend User Interface
* **HTML5 & CSS3**: Pure, vanilla frontend implementation with zero reliance on heavy frameworks like React or Angular. Uses CSS Variables extensively for dynamic theming (Dark/Light modes).
* **Glassmorphism**: UI elements feature translucent, blurred backgrounds for a premium "Apple-like" aesthetic.
* **Vanilla JavaScript**: Handles state management, DOM manipulation, asynchronous API `fetch` calls, drag-and-drop Kanban functionality, and modal interactions.
* **FontAwesome**: Provides standard, scalable vector icons for the user interface.
* **SVG Rendering**: Dynamic, code-generated SVGs are used to map AFLOW template distributions and career mobility trajectories without heavy charting libraries.

---

## 🧠 Key Features & Academic Innovations

SmartApply isn't just an automation script; it incorporates several research-backed innovations:

1. **Dual-ATS Bias-Aware Engine**: Calculates a "Fairness Delta" by running job applications through an evaluator twice: once with the raw resume, and once with an anonymized version (removing gender, tier-1 university names, etc.) to detect bias.
2. **Multi-Agent RAG Pipeline**: Orchestrates a 5-step agentic flow (Extractor -> Evaluator -> Summariser -> Formatter -> Tailor) to build perfectly aligned applications.
3. **Ghost-Job Detector**: Calculates a Ghost-Job Probability Score by fusing Temporal Decay (age of listing), Macro-Layoff Indices (company trends), and Semantic Repost Duplication.
4. **AI Self-Preference Neutraliser**: Actively strips common LLM fingerprints (e.g., "Furthermore", "In conclusion", "Delve") and replaces them with natural, human business terminology.
5. **AFLOW Adaptive Prompt Optimizer**: Analyzes historical success rates in the SQLite database to automatically select the highest-performing cover letter prompt template ("Aggressive Metrics", "Humble Learner", or "Direct Value Proposer").
6. **Intrinsic Dimensionality Metrics**: Evaluates the geometric complexity of text embeddings using covariance eigenvalues to accurately determine if a generated cover letter feels "robotic" or "natural".
7. **Clarity & Readability Index**: Computes Flesch-Kincaid reading ease, penalizes overly long sentences, and tracks complex word density (jargon) to ensure all outbound communications are direct and professional.

---

## 🚀 Quick Start & Installation

### Step 1: Install Dependencies
Open your terminal in the project root folder and run:
```bash
pip install -r requirements.txt
```

### Step 2: Initialize the Database
Seed the SQLite database with the necessary schema and dummy historical data:
```bash
python database/models.py
```

### Step 3: Run the Diagnostics Test Suite
Verify that the mathematical pipelines, embeddings, and clarity metrics are fully operational:
```bash
python verify.py
```

### Step 4: Host the Backend & UI
Launch the FastAPI gateway with live reload:
```bash
python main.py
```
*Alternatively: `uvicorn main:app --reload --port 8000`*

Open your browser and navigate to **`http://127.0.0.1:8000`** to experience the SmartApply dashboard.

---

*Developed by SmartApply (2026). All Rights Reserved. Built for B.Tech Final Year Evaluation.*
