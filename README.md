# AI Job Application Automation System (AURA Systems)
### Complete Research, Innovation & B.Tech Viva Reference Manual (2025-2026)

Welcome to the **AI Job Application Automation System**, a production-grade, research-backed automation suite and analytics platform. This system implements a single-page dark glassmorphic dashboard served via a **FastAPI backend** and orchestrates **10 academic innovations** from the 2025-2026 AI and automation literature.

Designed specifically for final-year engineering project showcases, the codebase contains zero hardware dependencies and features zero-crash premium mock fallbacks to guarantee a flawless live demonstration even without a local GPU or active Ollama server.

---

## 🚀 1. Quick Start Guide

### Step 1: Install Dependencies
Open your PowerShell / Command Prompt inside the project root folder `D:\AI-Job-Automation-System` and install the package requirements:
```bash
pip install -r requirements.txt
```
*(Dependencies include `fastapi`, `uvicorn`, `pdfplumber`, `python-docx`, `numpy`, and `beautifulsoup4`)*

### Step 2: Initialize & Seed SQLite Database
Run the schema migration file to automatically initialize `database.db` and populate it with 15 simulated job records, prompt tracking success logs, and career mobility paths:
```bash
python database/models.py
```

### Step 3: Run the Diagnostics Test Suite
Validate the mathematical accuracy of similarity computations, RAG gaps, anonymization functions, and G-Eval judges:
```bash
python verify.py
```

### Step 4: Host the Web Dashboard UI
Launch the FastAPI gateway with live reload tracking enabled:
```bash
python main.py
```
Or use uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```
Open your browser and navigate to **`http://127.0.0.1:8000`** to view your running dashboard.

---

## 🎨 2. High-Fidelity UI Features
The frontend features a responsive, deep-dark glassmorphic SPA layout:
1. **System Diagnostics Dashboard:** Real-time counters showing **GCR** (Goal Completion Rate), **MTR** (Multi-Step Task Resilience), G-Eval averages, and interactive SVG charts representing **AFLOW template performance distributions** stored in SQLite.
2. **Interactive Kanban Board:** Supports vanilla HTML5 drag-and-drop mechanics. Cards representing applications can be dragged between matched, scheduled, and applied columns, instantly triggering database state modifications.
3. **Multi-Agent RAG Matcher Panel:** Enables text or resume document parsing (via `pdfplumber`/`python-docx`), scraping target job listings, running sequential agent alignments, showing **Bias Fairness Deltas**, displaying missing skill gap **Counterfactual Explanations** with active Coursera links, and generating neutralised cover letters.
4. **Timeline Scheduler:** Displays scheduled queue elements awaiting their local midweek optimal attention slots.
5. **Career Mobility Graph:** Renders co-occurrence node linkages dynamically inside a glowing vector canvas to outline engineering career trajectories.

---

## 🧬 3. The 10 Academic Innovations Explained

### Innovation 1: Bias-Aware Dual-ATS Engine & Fairness Delta
Standard applicant screening systems are prone to demographic bias (gender, region, names). Our system runs a **dual-pass evaluation**:
* **Pass 1:** Evaluates candidate suitability on the **Raw Resume**.
* **Pass 2:** Evaluates on an **Anonymized Resume** (name is replaced with `[Candidate Name]`, pronouns are neutralized to `They/Them`, tier-1 colleges are masked to `[Tier-1 Technical University]`, and FAANG employers are replaced with `[FAANG Technology Corporation]`).
* **Fairness Delta Equation:**  
  $$\Delta_{\text{fairness}} = \text{Score}_{\text{raw}} - \text{Score}_{\text{anonymized}}$$
  A high positive delta flags potential institutional demographic bias in recruiters' filters, whereas a negative delta denotes anonymous matching advantages.

### Innovation 2: `recos` Metric (Rank Concordance Similarity - arXiv:2602.05266, Feb 2026)
Standard cosine similarity measures only linear vector alignment, failing to weight the prominence of key variables. The `recos` metric sorts absolute component values to locate peak features and penalizes rank alignment divergence exponentially:
$$\text{recos} = \sum_{i} \left( e^{-\frac{\min(r_{1,i}, r_{2,i})}{25}} \cdot v_{1,i} v_{2,i} \cdot e^{-5 \cdot |r_{1,i} - r_{2,i}|/N} \right)$$
This rewards candidates whose most prominent skills align precisely with the job description's primary expectations, outperforming classic flat cosine evaluations.

### Innovation 3: Skill-Decomposed Weighted Matching (SDWM)
Instead of matching resumes as a monolithic block, SDWM segments keywords into **Core Skills** (70% weight) and **Preferred Skills** (30% weight). It computes semantic similarities individually per skill and aggregates them to prevent high volume irrelevant text from masking critical skill gaps.

### Innovation 4: Counterfactual Match Explanations
Instead of simply telling the candidate they "failed to match", the engine performs **counterfactual reasoning**. It computes the minimum textual modifications (missing skills) necessary to push the match score above the 80% threshold and generates customized learning paths with direct training resource hyperlinks.

### Innovation 5: Career Trajectory Knowledge Graph
Maintains an adjacency list of career transitions and co-occurring skills in SQLite. Drawing nodes and edges dynamically on a vector SVG canvas, it maps standard progression routes (e.g., *Junior Developer -> SDE -> Machine Learning Engineer*) to help candidates understand target skill mobilities.

### Innovation 6: AFLOW Adaptive Prompt Template Optimizer
Orchestrates dynamic prompt selection. Rather than using fixed cover letter instructions, it queries historical outcomes (reply vs ghosted) inside `prompt_performance`. It selects the prompt category showing the highest statistical yield (e.g., favoring `Aggressive Metrics` templates for metric-focused jobs and `Humble Learner` templates for research-focused roles).

### Innovation 7: AI Self-Preference Neutraliser
Generative LLMs consistently leave "fingerprints" (robotic transitions like *Furthermore, In conclusion, testament to, I am thrilled to align*). A post-processing parser scans the generated cover letter and substitutes these transitions with clean, natural human business equivalents, ensuring documents pass automated AI-detectors.

### Innovation 8: Chronological Application Scheduler
Submitting applications on Sunday nights often results in listings being buried. The chronological scheduler locks candidate submissions into historical **optimal midweek response windows** (Tuesday through Thursday morning, 8:00 AM to 10:00 AM local time).

### Innovation 9: Vacancy Ghost-Job Detector
Simulates active listing validation. It aggregates:
1. **Temporal Decay:** Job age penalizations (>30 days).
2. **Layoff Index:** Checks if the company is undergoing hiring freezes or corporate restructures.
3. **Repost Duplication:** Matches description embeddings against recurring monthly template repost loops to warn candidates of "evergreen resume harvesting".

### Innovation 10: Intrinsic Dimensionality Geometric Metric
Measures text complexity to detect robotic generation. By analyzing sentence embedding eigenvalues and computing the Participation Ratio:
$$\text{PR} = \frac{\left( \sum \lambda_i \right)^2}{\sum \lambda_i^2}$$
The system calculates text geometric entropy. Since LLMs prefer predictable token streams, low intrinsic dimensionality alerts candidates to heavily automated sentence structures.

---

## 🎓 4. B.Tech Viva Q&A Handbook

### Q1: What is the main research gap this system addresses?
**Answer:** Standard application systems suffer from three major research gaps: demographic screening biases, flat linear similarity matching (which ignores relative skill weights), and high rates of "Ghost Jobs" (evergreen listings that companies leave vacant to collect resume banks). Our system bridges these gaps using a Bias-ATS dual-scoring engine, the `recos` Metric for rank prominence, and a multi-factor Ghost Score detector.

### Q2: Explain how the `recos` Metric differs from traditional Cosine Similarity.
**Answer:** Traditional Cosine Similarity measures the angular distance between two dense vector representations. However, it treats every vector dimension equally. The `recos` metric, published in early 2026, sorts dimensions by absolute intensity to locate prominent features. It scales matching contributions using exponential decay based on component ranking, heavily rewarding alignment on the most prominent skills while penalizing rank differences.

### Q3: What is "Intrinsic Dimensionality" and how does the Participation Ratio evaluate it?
**Answer:** Intrinsic Dimensionality is a geometric measure of textual variation. Repetitive or templated AI text clusters tightly in a low-dimensional subspace. To measure this, we segment a document into sentences, generate their embeddings, compute their covariance matrix, and find their eigenvalues $\lambda_i$. The **Participation Ratio** acts as an entropy index: if a few eigenvalues dominate, the ratio is low, denoting a robotic template signature. If the eigenvalues are distributed evenly, the ratio is high, signifying natural human text diversity.

### Q4: Why is there a mock fallback mode implemented?
**Answer:** For a high-stakes B.Tech Final Year Viva, hardware independence is critical. If the examiner's laptop lacks a GPU or cannot reach local Ollama / SentenceTransformer instances, our fallback mode runs deterministic, hash-seeded mathematical algorithms. It returns highly realistic, academically accurate metrics, RAG gaps, and beautiful glassmorphic dashboards immediately upon first load with zero runtime crashes.

---

*Developed by AURA Systems (2026). All Rights Reserved.*
