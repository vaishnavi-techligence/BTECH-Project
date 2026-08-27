// State management
let currentResumeText = "";
let currentJdText = "";
let currentUploadedSkills = [];
let applicationsList = [];

// DOM elements
const loadingOverlay = document.getElementById("loading-overlay");

// --- JWT AUTHENTICATION INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    
    // Check if the URL needs auth (most /api endpoints)
    if (typeof resource === 'string' && resource.startsWith('/api') && !resource.includes('/api/login') && !resource.includes('/api/register')) {
        const token = localStorage.getItem("jwt_token");
        if (!token) {
            document.getElementById("auth-overlay").style.display = "flex";
            throw new Error("Authentication required");
        }
        
        config = config || {};
        config.headers = config.headers || {};
        
        // If config.headers is a Headers object, we need to append
        if (config.headers instanceof Headers) {
            config.headers.append("Authorization", `Bearer ${token}`);
        } else {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
    }
    
    try {
        const response = await originalFetch(resource, config);
        if (response.status === 401) {
            // Token expired or invalid
            handleLogout();
            throw new Error("Session expired. Please login again.");
        }
        return response;
    } catch (e) {
        throw e;
    }
};

// --- AUTH UI LOGIC ---
function switchAuthTab(tab) {
    document.getElementById("tab-login-btn").classList.remove("active");
    document.getElementById("tab-register-btn").classList.remove("active");
    document.getElementById("auth-login-form").style.display = "none";
    document.getElementById("auth-register-form").style.display = "none";
    document.getElementById("auth-error-msg").style.display = "none";
    document.getElementById("auth-success-msg").style.display = "none";
    
    if (tab === 'login') {
        document.getElementById("tab-login-btn").classList.add("active");
        document.getElementById("auth-login-form").style.display = "block";
    } else {
        document.getElementById("tab-register-btn").classList.add("active");
        document.getElementById("auth-register-form").style.display = "block";
    }
}

async function handleLogin() {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    const errorEl = document.getElementById("auth-error-msg");
    errorEl.style.display = "none";
    
    if (!user || !pass) {
        errorEl.innerText = "Please enter username and password.";
        errorEl.style.display = "block";
        return;
    }
    
    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);
    
    try {
        const res = await originalFetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Login failed");
        }
        
        const data = await res.json();
        localStorage.setItem("jwt_token", data.access_token);
        document.getElementById("auth-overlay").style.display = "none";
        refreshDashboardData();
    } catch (e) {
        errorEl.innerText = e.message;
        errorEl.style.display = "block";
    }
}

async function handleRegister() {
    const user = document.getElementById("register-username").value;
    const pass = document.getElementById("register-password").value;
    const errorEl = document.getElementById("auth-error-msg");
    const successEl = document.getElementById("auth-success-msg");
    errorEl.style.display = "none";
    successEl.style.display = "none";
    
    if (!user || !pass) {
        errorEl.innerText = "Please choose a username and password.";
        errorEl.style.display = "block";
        return;
    }
    
    try {
        const res = await originalFetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Registration failed");
        }
        
        successEl.innerText = "Registration successful! You can now sign in.";
        successEl.style.display = "block";
        setTimeout(() => switchAuthTab('login'), 1500);
    } catch (e) {
        errorEl.innerText = e.message;
        errorEl.style.display = "block";
    }
}

function handleLogout() {
    localStorage.removeItem("jwt_token");
    document.getElementById("auth-overlay").style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("jwt_token")) {
        document.getElementById("auth-overlay").style.display = "flex";
    } else {
        document.getElementById("auth-overlay").style.display = "none";
        refreshDashboardData();
    }
});

// TAB NAVIGATOR
function switchTab(tabId, el) {
    // Switch Active Tab links
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    el.classList.add("active");

    // Switch Content Panels
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    const targetTab = document.getElementById(tabId);
    targetTab.classList.add("active");

    // Alter page title/subtitles
    const title = document.getElementById("main-title");
    const subtitle = document.getElementById("main-subtitle");
    
    if (tabId === "tab-dashboard") {
        title.innerText = "Intelligence Diagnostic Hub";
        subtitle.innerText = "RAG alignment ratios, agent performance matrices, and multi-agent queue metrics.";
    } else if (tabId === "tab-kanban") {
        title.innerText = "Executive Kanban Pipeline";
        subtitle.innerText = "Interactive application tracking synchronized in real-time with SQLite database.";
    } else if (tabId === "tab-rag") {
        title.innerText = "Multi-Agent RAG Matcher Studio";
        subtitle.innerText = "Skill-decomposed weighted alignment, Dual-ATS anonymization, and learning gap recommendations.";
    } else if (tabId === "tab-scheduler") {
        title.innerText = "Chronological Queue Scheduler";
        subtitle.innerText = "Mid-week optimal time windows aligned with historical recruiting peak response rates.";
    } else if (tabId === "tab-graph") {
        title.innerText = "Career Mobility Trajectory Graph";
        subtitle.innerText = "Deep co-occurrence analytics mapping standard role-to-role engineering transitions.";
    } else if (tabId === "tab-crawler") {
        title.innerText = "Online Job Crawler & Evaluation Studio";
        subtitle.innerText = "Crawl public developer boards, scrape active descriptions, and evaluate match ratios in real-time.";
    }
}

// RESTORE/SYNC DATA
async function refreshDashboardData() {
    try {
        const response = await fetch("/api/get-applications");
        applicationsList = await response.json();
        
        populateKanbanBoard();
        populateSchedulerTable();
        
        const analyticsRes = await fetch("/api/get-analytics");
        const analytics = await analyticsRes.json();
        updateAnalyticsUI(analytics);
        
        const graphRes = await fetch("/api/get-knowledge-graph");
        const graphData = await graphRes.json();
        renderMobilityGraph(graphData);
    } catch (e) {
        console.error("Failed to sync live data:", e);
    }
}

// 1. UPDATE OVERVIEW PANEL
function updateAnalyticsUI(data) {
    document.getElementById("stat-total-jobs").innerText = data.total_jobs;
    document.getElementById("stat-gcr").innerText = `${data.gcr_percentage}%`;
    document.getElementById("stat-mtr").innerText = `${data.mtr_percentage}%`;
    document.getElementById("stat-geval").innerText = `${data.average_geval_judge_score}/5.0`;

    // Populate AFLOW Performance Bar Chart
    const aflowChart = document.getElementById("aflow-bar-chart");
    aflowChart.innerHTML = "";
    
    const colors = ["var(--primary-glow)", "var(--accent-purple)", "var(--accent-emerald)"];
    
    // Default mock bar heights if prompt logs are very small
    const mockRates = [
        { template: "Aggressive Metrics", rate: 82.5 },
        { template: "Humble Learner", rate: 41.2 },
        { template: "Direct Value Proposer", rate: 68.4 }
    ];
    
    const rates = data.prompt_performance && data.prompt_performance.length > 0 
        ? data.prompt_performance 
        : mockRates;
        
    rates.forEach((r, idx) => {
        const rateVal = r.rate || r.rate === 0 ? r.rate : 50;
        const color = colors[idx % colors.length];
        
        const barContainer = document.createElement("div");
        barContainer.style.flex = "1";
        barContainer.style.display = "flex";
        barContainer.style.flexDirection = "column";
        barContainer.style.alignItems = "center";
        barContainer.style.height = "100%";
        barContainer.style.justifyContent = "flex-end";
        
        const rateText = document.createElement("div");
        rateText.innerText = `${rateVal}%`;
        rateText.style.fontSize = "0.78rem";
        rateText.style.fontWeight = "600";
        rateText.style.marginBottom = "0.4rem";
        rateText.style.color = "var(--text-primary)";
        
        const bar = document.createElement("div");
        bar.style.width = "46px";
        bar.style.height = `0%`;
        bar.style.background = `linear-gradient(180deg, ${color} 0%, rgba(56, 189, 248, 0.15) 100%)`;
        bar.style.borderRadius = "8px 8px 0 0";
        bar.style.borderTop = `2px solid ${color}`;
        bar.style.boxShadow = `0 0 20px ${color}44`;
        bar.style.transition = "height 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
        
        barContainer.appendChild(rateText);
        barContainer.appendChild(bar);
        aflowChart.appendChild(barContainer);
        
        // Trigger animation
        setTimeout(() => {
            bar.style.height = `${rateVal}%`;
        }, 100);
    });
}

// 2. PARSE RESUME ACTIONS
async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById("file-upload-status");
    statusEl.innerText = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/parse-resume", {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Parse failure");
        }
        
        const data = await res.json();
        currentResumeText = data.full_text;
        currentUploadedSkills = data.parsed_skills;
        
        document.getElementById("resume-text").value = data.full_text;
        statusEl.innerText = `Successfully parsed ${file.name} (${data.parsed_skills.length} skills detected)`;
        statusEl.style.color = "var(--accent-emerald)";
    } catch (e) {
        statusEl.innerText = `Upload failed: ${e.message}`;
        statusEl.style.color = "var(--accent-rose)";
    }
}

// 3. JOB SCRAPING
async function triggerJobScraping() {
    const url = document.getElementById("jd-url").value;
    if (!url) {
        alert("Please provide a valid career portal URL.");
        return;
    }

    const scrapeBtn = document.querySelector('[onclick="triggerJobScraping()"]');
    const originalText = scrapeBtn.innerText;
    scrapeBtn.innerText = "Fetching...";
    scrapeBtn.disabled = true;

    try {
        const res = await fetch("/api/scrape-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });
        
        const data = await res.json();
        
        document.getElementById("jd-company").value = data.company;
        document.getElementById("jd-role").value = data.role;
        document.getElementById("jd-text").value = data.jd;
        
        currentJdText = data.jd;
        
        // Show Ghost Warning if score is high
        const ghostCard = document.getElementById("result-ghost-card");
        const ghostScoreEl = document.getElementById("result-ghost-score");
        const ghostIndicatorEl = document.getElementById("result-ghost-indicator");
        
        if (data.ghost_report && data.ghost_report.ghost_score >= 40.0) {
            ghostCard.style.display = "block";
            ghostScoreEl.innerText = `${data.ghost_report.ghost_score}%`;
            ghostIndicatorEl.innerText = data.ghost_report.indicators.join(" | ");
        } else {
            ghostCard.style.display = "none";
        }
        
        alert(`Scraped ${data.company} - ${data.role} successfully!`);
    } catch (e) {
        alert("Error scraping URL: " + e.message);
    } finally {
        scrapeBtn.innerText = originalText;
        scrapeBtn.disabled = false;
    }
}

// 3b. TOP 10 TECH COMPANIES SCRAPER & MATCHER
let currentTop10Jobs = [];

async function triggerTop10CompanyScrape() {
    const roleQuery = document.getElementById("jd-role").value || "Software Engineer";
    const resumeText = document.getElementById("resume-text").value || "";

    const btn = document.querySelector('[onclick="triggerTop10CompanyScrape()"]');
    const origHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--primary-glow);"></i> Scanning Resume & Scraping Top 10 Tech Portals...`;
    btn.disabled = true;

    try {
        const res = await fetch("/api/scrape-top-10-companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role_query: roleQuery, resume_text: resumeText })
        });

        if (!res.ok) throw new Error("Failed to scrape top 10 company listings.");
        const data = await res.json();
        currentTop10Jobs = data.jobs;

        const container = document.getElementById("top10-jobs-container");
        const listEl = document.getElementById("top10-jobs-list");
        container.style.display = "block";
        listEl.innerHTML = "";

        data.jobs.forEach((job, idx) => {
            const matchColor = job.match_percentage >= 80 ? "var(--accent-emerald)" : (job.match_percentage >= 60 ? "var(--primary-glow)" : "var(--accent-amber)");
            const card = document.createElement("div");
            card.style.cssText = "background: var(--bg-pill); backdrop-filter: blur(16px); border: 1px solid var(--border-glass); border-top: 1px solid var(--border-glass-highlight); border-radius: 14px; padding: 1rem 1.2rem; display: flex; justify-content: space-between; align-items: center; gap: 1.2rem; transition: var(--transition-smooth);";
            card.onmouseover = () => { card.style.borderColor = "var(--primary-glow)"; card.style.background = "var(--border-glass-highlight)"; card.style.transform = "translateX(4px)"; };
            card.onmouseout = () => { card.style.borderColor = "var(--border-glass)"; card.style.background = "var(--bg-pill)"; card.style.transform = "translateX(0)"; };

            card.innerHTML = `
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem;">
                  <span style="font-weight: 700; color: var(--text-primary); font-size: 1rem; font-family: var(--font-heading);">${job.company}</span>
                  <span style="font-size: 0.82rem; color: var(--text-secondary);">| ${job.role}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">
                  ${job.jd}
                </div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem;">
                <span style="background: rgba(0,0,0,0.5); border: 1px solid ${matchColor}; color: ${matchColor}; font-weight: 700; font-size: 0.82rem; padding: 0.25rem 0.7rem; border-radius: 20px;">
                  ${job.match_percentage}% Match
                </span>
                <button type="button" onclick="selectTop10Job(${idx})" class="custom-button" style="padding: 0.45rem 1rem; font-size: 0.8rem; border-radius: 8px;">
                  <i class="fa-solid fa-bolt"></i> Select & Run
                </button>
              </div>
            `;
            listEl.appendChild(card);
        });

        document.getElementById("top10-status-text").innerText = `Found ${data.jobs.length} roles for '${data.role_query}'`;
    } catch (e) {
        alert("Scraping error: " + e.message);
    } finally {
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
}

function selectTop10Job(index) {
    const job = currentTop10Jobs[index];
    if (!job) return;

    document.getElementById("jd-url").value = job.url;
    document.getElementById("jd-company").value = job.company;
    document.getElementById("jd-role").value = job.role;
    document.getElementById("jd-text").value = job.jd;
    currentJdText = job.jd;

    // Trigger pipeline automatically!
    triggerMatchingPipeline();
}

// 4. SEQUENTIAL PIPELINE TRIGGER
async function triggerMatchingPipeline() {
    const resumeText = document.getElementById("resume-text").value;
    const jdText = document.getElementById("jd-text").value;
    const company = document.getElementById("jd-company").value;
    const role = document.getElementById("jd-role").value;

    if (!resumeText || !jdText || !company || !role) {
        alert("Please ensure Resume, Job Description, Company and Role fields are fully filled.");
        return;
    }

    loadingOverlay.style.display = "flex";

    try {
        // Run full RAG pipeline
        const pipelineRes = await fetch("/api/run-pipeline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resume_text: resumeText,
                jd_text: jdText,
                company: company,
                role: role
            })
        });
        
        const pipelineData = await pipelineRes.json();
        
        // Fetch detailed match results
        const matchRes = await fetch("/api/match-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resume_text: resumeText,
                jd_text: jdText
            })
        });
        const matchData = await matchRes.json();
        
        populatePipelineResults(pipelineData, matchData, company, role);
    } catch (e) {
        alert("Pipeline failed: " + e.message);
    } finally {
        loadingOverlay.style.display = "none";
    }
}

function populatePipelineResults(pipeline, match, company, role) {
    document.getElementById("results-placeholder").style.display = "none";
    const content = document.getElementById("results-content");
    content.style.display = "flex";

    // Set Scores
    const percent = Math.round(match.final_score * 100);
    const circle = document.getElementById("result-score-circle");
    circle.innerText = `${percent}%`;
    circle.style.background = `radial-gradient(circle, var(--bg-main) 62%, transparent 100%), conic-gradient(var(--primary-glow) 0deg, var(--accent-purple) ${percent * 3.6}deg, rgba(255,255,255,0.06) ${percent * 3.6}deg 360deg)`;

    document.getElementById("result-company-role").innerText = `${company} - ${role}`;
    document.getElementById("result-alignment-verdict").innerText = `Recos Similarity: ${match.recos_similarity} | G-Eval: ${match.geval_report.geval_index}/5.0 (${match.geval_report.verdict})`;

    // Populate Bias Table
    document.getElementById("result-bias-raw").innerText = `${pipeline.bias_report.raw_score}%`;
    document.getElementById("result-bias-anon").innerText = `${pipeline.bias_report.anonymized_score}%`;
    document.getElementById("result-bias-delta").innerText = `${pipeline.bias_report.fairness_delta}%`;
    document.getElementById("result-bias-status").innerText = pipeline.bias_report.status;

    // Populate Skills
    const container = document.getElementById("result-skills-container");
    container.innerHTML = "";
    match.core_skills_matched.forEach(s => {
        container.innerHTML += `<span class="skill-badge matched"><i class="fa-solid fa-square-check"></i> ${s} (Core)</span>`;
    });
    match.preferred_skills_matched.forEach(s => {
        container.innerHTML += `<span class="skill-badge matched"><i class="fa-solid fa-circle-check"></i> ${s}</span>`;
    });
    match.core_skills_missing.forEach(s => {
        container.innerHTML += `<span class="skill-badge missing"><i class="fa-solid fa-triangle-exclamation"></i> ${s} (Core)</span>`;
    });
    match.preferred_skills_missing.forEach(s => {
        container.innerHTML += `<span class="skill-badge missing"><i class="fa-solid fa-circle-xmark"></i> ${s}</span>`;
    });

    // Populate Counterfactual explanations
    const resGrid = document.getElementById("result-resources");
    resGrid.innerHTML = "";
    
    if (match.counterfactuals.length === 0) {
        resGrid.innerHTML = `<div style="font-size:0.85rem; color:var(--text-secondary);">No missing skills. Resume is perfectly tailored!</div>`;
    } else {
        match.counterfactuals.forEach(c => {
            resGrid.innerHTML += `
              <div class="resource-item">
                <div style="flex: 1; padding-right: 1rem;">
                  <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); margin-bottom:0.2rem;">Missing: ${c.skill} <span style="color:var(--accent-rose); font-size:0.75rem; font-weight:600; background:rgba(244,63,94,0.1); padding:0.1rem 0.5rem; border-radius:6px; margin-left:0.4rem;">Impact: ${c.impact_score}</span></div>
                  <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">${c.recommendation}</div>
                </div>
                <a href="${c.learning_resource_url}" target="_blank" class="resource-link"><i class="fa-solid fa-up-right-from-square"></i> Training</a>
              </div>
            `;
        });
    }

    // Cover letter block
    document.getElementById("result-cover-letter").value = pipeline.cover_letter;
    document.getElementById("result-aflow-name").innerText = pipeline.optimal_template_used;
    document.getElementById("result-dna-name").innerText = pipeline.culture_dna;

    // Tailored resume block
    if (document.getElementById("result-tailored-resume")) {
        document.getElementById("result-tailored-resume").value = pipeline.tailored_resume || "Generating tailored resume...";
    }

    // Attach scheduling / instantly apply buttons
    const schedBtn = document.getElementById("btn-schedule-app");
    schedBtn.onclick = () => runScheduling(pipeline.application_id);
    
    const applyBtn = document.getElementById("btn-apply-app");
    applyBtn.onclick = () => runInstantApplication(pipeline.application_id);

    // Dynamic focus scroll
    content.scrollIntoView({ behavior: "smooth" });
}

// 5. RUN CHRONO SCHEDULER
async function runScheduling(appId) {
    try {
        const res = await fetch("/api/schedule-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ application_id: appId, timezone: "US/Eastern" })
        });
        const data = await res.json();
        
        alert(`Successfully queued application ID ${appId} for ${data.scheduled_time} (optimal midweek index).`);
        refreshDashboardData();
        
        // Switch to timeline queue tab
        switchTab("tab-scheduler", document.querySelector('[onclick*="tab-scheduler"]'));
    } catch (e) {
        alert("Scheduling failed: " + e.message);
    }
}

// 6. RUN AUTO APPLIER FORM FILLER
async function runInstantApplication(appId) {
    loadingOverlay.querySelector("h3").innerText = "Executing Playwright Form Automation...";
    loadingOverlay.style.display = "flex";

    try {
        const res = await fetch(`/api/apply-now/${appId}`, { method: "POST" });
        const data = await res.json();
        
        alert(`Application submission completed!\n\nLogs:\n${data.logs.slice(-3).join('\n')}`);
        refreshDashboardData();
        switchTab("tab-kanban", document.querySelector('[onclick*="tab-kanban"]'));
    } catch (e) {
        alert("Browser submission automation error: " + e.message);
    } finally {
        loadingOverlay.querySelector("h3").innerText = "Executing Sequential Agent Pipeline...";
        loadingOverlay.style.display = "none";
    }
}

// 7. POPULATE KANBAN PANEL
function populateKanbanBoard() {
    const cols = {
        "matched": document.getElementById("cards-matched"),
        "scheduled": document.getElementById("cards-scheduled"),
        "applied": document.getElementById("cards-applied"),
        "got reply": document.getElementById("cards-replied")
    };

    // Clean columns
    for (let c in cols) {
        if (cols[c]) cols[c].innerHTML = "";
    }

    let counts = { "matched": 0, "scheduled": 0, "applied": 0, "got reply": 0 };

    applicationsList.forEach(app => {
        let colKey = app.status;
        if (colKey === "parsed") colKey = "matched"; // unify
        if (colKey === "ghosted") colKey = "applied"; // render in applied column or ghosted list
        
        const listEl = cols[colKey];
        if (listEl) {
            counts[colKey]++;
            const pct = Math.round(app.match_score * 100);
            
            const card = document.createElement("div");
            card.className = "issue-card";
            card.draggable = true;
            card.id = `app-card-${app.id}`;
            card.ondragstart = (e) => dragStart(e, app.id);
            
            card.innerHTML = `
              <div class="issue-company">${app.company}</div>
              <div class="issue-role">${app.role}</div>
              <div class="issue-meta">
                <span class="match-tag" style="background:${app.match_score >= 0.8 ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)'}; color:${app.match_score >= 0.8 ? 'var(--accent-emerald)' : 'var(--accent-purple)'}">${pct}% match</span>
                <span>Tone: ${app.culture_tone || 'Direct'}</span>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:0.6rem; margin-top:1rem; padding-top:0.8rem; border-top:1px solid var(--border-glass); flex-wrap:wrap;">
                <button onclick="openTailoredResumeModal('${app.company}', '${app.role}', \`${(app.jd || '').replace(/`/g, "'").replace(/\$/g, "&#36;")}\`)" class="custom-button secondary" style="padding:0.35rem 0.75rem; font-size:0.75rem; border-color:rgba(16,185,129,0.3); color:var(--accent-emerald);"><i class="fa-solid fa-file-user"></i> Resume</button>
                ${app.status === 'matched' ? `<button onclick="runScheduling(${app.id})" class="custom-button secondary" style="padding:0.35rem 0.75rem; font-size:0.75rem; border-color:rgba(168,85,247,0.3); color:var(--text-primary);"><i class="fa-solid fa-calendar-check" style="color:var(--accent-purple);"></i> Schedule</button>` : ''}
                ${app.status === 'scheduled' ? `<button onclick="runInstantApplication(${app.id})" class="custom-button" style="padding:0.35rem 0.75rem; font-size:0.75rem;"><i class="fa-solid fa-paper-plane"></i> Apply Now</button>` : ''}
              </div>
            `;
            listEl.appendChild(card);
        }
    });

    // Update badges
    document.getElementById("badge-matched").innerText = counts["matched"];
    document.getElementById("badge-scheduled").innerText = counts["scheduled"];
    document.getElementById("badge-applied").innerText = counts["applied"];
    document.getElementById("badge-replied").innerText = counts["got reply"];
}

// 8. DRAG AND DROP HANDLERS
let activeDraggedId = null;

function dragStart(ev, appId) {
    activeDraggedId = appId;
    ev.dataTransfer.setData("text/plain", appId);
}

function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add("dragover");
}

function dragLeave(ev) {
    ev.currentTarget.classList.remove("dragover");
}

async function drop(ev, status) {
    ev.preventDefault();
    ev.currentTarget.classList.remove("dragover");
    
    const appId = ev.dataTransfer.getData("text/plain") || activeDraggedId;
    if (!appId) return;

    try {
        await fetch("/api/update-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ application_id: parseInt(appId), status: status })
        });
        
        refreshDashboardData();
    } catch (e) {
        console.error("Drop status update failed:", e);
    }
}

// 9. POPULATE SCHEDULER timeline
function populateSchedulerTable() {
    const tableBody = document.getElementById("scheduler-table-body");
    tableBody.innerHTML = "";

    const scheduledApps = applicationsList.filter(a => a.status === "scheduled");

    if (scheduledApps.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:1.5rem; text-align:center; color:var(--text-secondary);">No job applications active in scheduled pipeline queue.</td></tr>`;
        return;
    }

    scheduledApps.forEach(a => {
        // Calculate optimal date string
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        
        tableBody.innerHTML += `
          <tr style="border-bottom:1px solid var(--border-glass);">
            <td style="padding:1rem;">#${a.id}</td>
            <td style="padding:1rem; font-weight:600;">${a.company}</td>
            <td style="padding:1rem;">${a.role}</td>
            <td style="padding:1rem; color:var(--primary-glow); font-weight:500;">${d.toLocaleString()}</td>
            <td style="padding:1rem;">US/Eastern (Mid-week Peak)</td>
            <td style="padding:1rem;"><span style="color:var(--accent-purple); font-weight:600;"><i class="fa-solid fa-spinner fa-spin"></i> Queueing</span></td>
            <td style="padding:1.2rem; text-align:right;">
              <button onclick="runInstantApplication(${a.id})" class="custom-button" style="padding:0.5rem 1rem; font-size:0.8rem;">
                <i class="fa-solid fa-paper-plane"></i> Trigger Submission
              </button>
            </td>
          </tr>
        `;
    });
}

// 10. RENDER MOBILITY TRAJECTORY GRAPH (Innovation 5)
function renderMobilityGraph(data, filterMode = 'all') {
    window.currentGraphData = data;
    window.currentGraphFilter = filterMode;
    
    const container = document.getElementById("graph-container");
    if (!container) return;
    container.innerHTML = "";
    
    // Position coordinates aligned to all 9 matching job roles and core technical skills
    const nodeCoords = {
        // Foundation Languages & Competencies (Col 1)
        "Python": { x: 60, y: 80, type: "skill" },
        "SQL": { x: 60, y: 180, type: "skill" },
        "Java": { x: 60, y: 280, type: "skill" },
        "C++": { x: 60, y: 380, type: "skill" },
        "Ruby": { x: 60, y: 480, type: "skill" },
        "Prompting": { x: 60, y: 580, type: "skill" },

        // Frameworks, Cloud & AI Tools (Col 2)
        "React": { x: 220, y: 60, type: "skill" },
        "PyTorch": { x: 220, y: 150, type: "skill" },
        "RAG": { x: 220, y: 240, type: "skill" },
        "OpenAI": { x: 220, y: 330, type: "skill" },
        "AWS": { x: 220, y: 420, type: "skill" },
        "CUDA": { x: 220, y: 510, type: "skill" },
        "Docker": { x: 220, y: 600, type: "skill" },
        "Spring Boot": { x: 320, y: 290, type: "skill" },
        "G-Eval": { x: 320, y: 560, type: "skill" },

        // Entry & Foundation Engineering Roles (Col 3)
        "Full Stack Engineer": { x: 420, y: 80, type: "role" },
        "Data Analyst": { x: 420, y: 210, type: "role" },
        "Junior SDE": { x: 420, y: 340, type: "role" },
        "Backend Engineer": { x: 420, y: 470, type: "role" },

        // Mid-Level & Core Matching Job Roles (Col 4)
        "LLM Prompt Engineer": { x: 640, y: 70, type: "role" },
        "AI Consultant": { x: 640, y: 180, type: "role" },
        "Data Scientist": { x: 640, y: 290, type: "role" },
        "Software Development Engineer": { x: 640, y: 400, type: "role" },
        "Autonomous Vehicle Dev": { x: 640, y: 510, type: "role" },
        "Senior SDE": { x: 640, y: 610, type: "role" },

        // Senior, Leadership & Research Roles (Col 5)
        "Senior Research Scientist": { x: 880, y: 150, type: "role" },
        "Machine Learning Engineer": { x: 880, y: 300, type: "role" },
        "Tech Lead": { x: 880, y: 450, type: "role" },
        "Engineering Manager": { x: 880, y: 580, type: "role" }
    };

    // Dynamic coordinate assignment fallback for any missing nodes in database
    let dynamicX = 500;
    let dynamicY = 50;
    data.forEach(edge => {
        [edge.source, edge.target].forEach(nodeName => {
            if (!nodeCoords[nodeName]) {
                const isSkill = (edge.type === "skill-to-role" && nodeName === edge.source);
                nodeCoords[nodeName] = { 
                    x: dynamicX, 
                    y: dynamicY, 
                    type: isSkill ? "skill" : "role" 
                };
                dynamicY += 70;
                if (dynamicY > 620) {
                    dynamicY = 60;
                    dynamicX += 160;
                }
            }
        });
    });

    // Filter edges based on user selection to reduce visual clutter
    const filteredEdges = data.filter(edge => {
        if (filterMode === 'all') return true;
        return edge.type === filterMode;
    });

    // Draw SVG connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "680");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.zIndex = "1";
    container.appendChild(svg);

    // Track all SVG paths and DOM nodes for Obsidian-style focus on hover
    const pathElements = [];
    const nodeElements = {};

    // Draw connecting paths (Edges)
    filteredEdges.forEach(edge => {
        const start = nodeCoords[edge.source];
        const end = nodeCoords[edge.target];
        
        if (start && end) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            
            // Draw a beautiful curved line
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // curvature
            
            line.setAttribute("d", `M${start.x},${start.y} A${dr},${dr} 0 0,1 ${end.x},${end.y}`);
            
            // Softer default opacity to eliminate "spaghetti graph" clutter
            const defaultColor = edge.type === "skill-to-role" ? "rgba(56, 189, 248, 0.16)" : "rgba(168, 85, 247, 0.22)";
            const defaultWidth = Math.min(4, 1.2 + edge.weight / 6);
            
            line.setAttribute("stroke", defaultColor);
            line.setAttribute("stroke-width", defaultWidth);
            line.setAttribute("fill", "none");
            line.setAttribute("marker-end", "url(#arrow)");
            line.style.transition = "all 0.3s ease";
            
            svg.appendChild(line);
            pathElements.push({
                path: line,
                source: edge.source,
                target: edge.target,
                type: edge.type,
                defaultColor: defaultColor,
                defaultWidth: defaultWidth
            });
        }
    });

    // Draw nodes on top
    for (let name in nodeCoords) {
        // Only draw nodes that actually participate in at least one visible edge in this filter mode
        const participates = filteredEdges.some(e => e.source === name || e.target === name);
        if (!participates) continue;

        const coord = nodeCoords[name];
        const node = document.createElement("div");
        node.className = "node-group";
        node.style.left = `${coord.x - 40}px`;
        node.style.top = `${coord.y - 15}px`;
        node.style.zIndex = "5";
        node.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
        
        if (coord.type === "skill") {
            node.style.borderLeft = "3px solid var(--primary-glow)";
            node.style.boxShadow = "0 4px 15px rgba(56, 189, 248, 0.15)";
            node.innerHTML = `<i class="fa-solid fa-code" style="color:var(--primary-glow); margin-right:6px;"></i> ${name}`;
        } else {
            node.style.borderLeft = "3px solid var(--accent-purple)";
            node.style.boxShadow = "0 4px 15px rgba(168, 85, 247, 0.15)";
            node.innerHTML = `<i class="fa-solid fa-briefcase" style="color:var(--accent-purple); margin-right:6px;"></i> ${name}`;
        }
        
        // Obsidian-Style Focus on Hover (Highlight connected, dim background noise)
        node.onmouseenter = () => {
            const connectedNames = new Set([name]);
            
            pathElements.forEach(item => {
                if (item.source === name || item.target === name) {
                    connectedNames.add(item.source);
                    connectedNames.add(item.target);
                    item.path.setAttribute("stroke", item.type === "skill-to-role" ? "#38bdf8" : "#c084fc");
                    item.path.setAttribute("stroke-width", "3.5");
                    item.path.style.opacity = "1";
                    item.path.style.filter = `drop-shadow(0 0 8px ${item.type === "skill-to-role" ? "rgba(56, 189, 248, 0.8)" : "rgba(168, 85, 247, 0.8)"})`;
                } else {
                    item.path.style.opacity = "0.04";
                    item.path.style.filter = "none";
                }
            });

            for (let nName in nodeElements) {
                if (connectedNames.has(nName)) {
                    nodeElements[nName].style.opacity = "1";
                    nodeElements[nName].style.transform = "scale(1.08)";
                    nodeElements[nName].style.zIndex = "10";
                    nodeElements[nName].style.boxShadow = nodeCoords[nName].type === "skill"
                        ? "0 8px 25px rgba(56, 189, 248, 0.4)"
                        : "0 8px 25px rgba(168, 85, 247, 0.4)";
                } else {
                    nodeElements[nName].style.opacity = "0.18";
                    nodeElements[nName].style.transform = "scale(0.94)";
                    nodeElements[nName].style.zIndex = "4";
                    nodeElements[nName].style.boxShadow = "none";
                }
            }
        };

        node.onmouseleave = () => {
            pathElements.forEach(item => {
                item.path.setAttribute("stroke", item.defaultColor);
                item.path.setAttribute("stroke-width", item.defaultWidth);
                item.path.style.opacity = "1";
                item.path.style.filter = "none";
            });

            for (let nName in nodeElements) {
                nodeElements[nName].style.opacity = "1";
                nodeElements[nName].style.transform = "scale(1)";
                nodeElements[nName].style.zIndex = "5";
                nodeElements[nName].style.boxShadow = nodeCoords[nName].type === "skill"
                    ? "0 4px 15px rgba(56, 189, 248, 0.15)"
                    : "0 4px 15px rgba(168, 85, 247, 0.15)";
            }
        };
        
        node.onclick = () => {
            alert(`Trajectory Node: '${name}' (${coord.type.toUpperCase()})\nClicking traces active job applications matching this competency path.`);
        };
        
        container.appendChild(node);
        nodeElements[name] = node;
    }
}

// Graph filter toggle function
function filterGraph(mode) {
    document.querySelectorAll(".graph-filter-btn").forEach(btn => {
        btn.style.background = "transparent";
        btn.style.color = "var(--text-secondary)";
        btn.style.boxShadow = "none";
    });
    const activeBtnId = mode === 'all' ? 'filter-all' : (mode === 'role-to-role' ? 'filter-role' : 'filter-skill');
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.style.background = "var(--primary-glow)";
        activeBtn.style.color = "#fff";
        activeBtn.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.4)";
    }
    if (window.currentGraphData) {
        renderMobilityGraph(window.currentGraphData, mode);
    }
}

// --- ONLINE JOB CRAWLER & SEARCH ENGINE ---
async function triggerOnlineCrawlerSearch() {
    const kwInput = document.getElementById("crawler-keywords");
    const keywords = kwInput.value ? kwInput.value.trim() : "";
    if (!keywords) {
        alert("Please enter search keywords (e.g. Python Developer).");
        return;
    }

    // Attempt to grab resume text from the RAG tab input if available
    const resumeText = document.getElementById("resume-text").value;
    
    loadingOverlay.querySelector("h3").innerText = `Crawling and Scraping '${keywords}'...`;
    loadingOverlay.style.display = "flex";

    try {
        const res = await fetch("/api/search-and-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                keywords: keywords,
                resume_text: resumeText || ""
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Crawl failed");
        }
        
        const data = await res.json();
        
        // Show/Update stats row
        document.getElementById("crawler-stats-row").style.display = "grid";
        document.getElementById("crawler-stat-found").innerText = data.total_fetched;
        document.getElementById("crawler-stat-matched").innerText = data.total_matched;
        document.getElementById("crawler-stat-status").innerText = "Crawled WWR Feed";
        document.getElementById("crawler-stat-status").style.color = "var(--primary-glow)";
        
        // Hide placeholder
        document.getElementById("crawler-placeholder").style.display = "none";
        
        // Render jobs list
        renderCrawledJobsList(data.jobs, resumeText);
    } catch (e) {
        alert("Crawler Error: " + e.message);
    } finally {
        loadingOverlay.querySelector("h3").innerText = "Executing Sequential Agent Pipeline...";
        loadingOverlay.style.display = "none";
    }
}

function renderCrawledJobsList(jobs, hasResume) {
    const listContainer = document.getElementById("crawler-results-list");
    listContainer.innerHTML = "";
    
    if (jobs.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-secondary);">No job listings found for those keywords. Try another search.</div>`;
        return;
    }
    
    jobs.forEach((job, idx) => {
        const pct = job.match_percentage;
        const skillsMatched = job.match_results.core_skills_matched || [];
        const skillsMissing = job.match_results.core_skills_missing || [];
        
        const card = document.createElement("div");
        card.className = "glass-panel";
        card.style.padding = "1.8rem";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "1.2rem";
        card.style.background = "rgba(15, 23, 42, 0.45)";
        card.style.border = "1px solid var(--border-glass)";
        card.style.borderTop = "1px solid rgba(255,255,255,0.15)";
        card.style.borderRadius = "16px";
        card.style.marginBottom = "1.6rem";
        
        // Header
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "flex-start";
        
        const titleSec = document.createElement("div");
        titleSec.innerHTML = `
            <h4 style="font-size:1.15rem; color:var(--text-primary); margin-bottom:0.25rem;">${job.role}</h4>
            <div style="font-size:0.85rem; color:var(--text-secondary); display:flex; gap:1rem; align-items:center; flex-wrap:wrap; margin-top:0.4rem;">
                <span><i class="fa-solid fa-building" style="color:var(--accent-purple); margin-right:4px;"></i> ${job.company}</span>
                <span><i class="fa-solid fa-globe" style="color:var(--primary-glow); margin-right:4px;"></i> ${job.source}</span>
                <span><i class="fa-solid fa-clock" style="margin-right:4px;"></i> ${job.listing_age_days} days ago</span>
            </div>
        `;
        
        const scoreSec = document.createElement("div");
        scoreSec.style.display = "flex";
        scoreSec.style.flexDirection = "column";
        scoreSec.style.alignItems = "center";
        
        if (hasResume && hasResume.trim().length > 20) {
            scoreSec.innerHTML = `
                <div style="width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; color: var(--text-primary); background: radial-gradient(circle, var(--bg-main) 62%, transparent 100%), conic-gradient(${pct >= 70 ? 'var(--accent-emerald)' : 'var(--primary-glow)'} 0deg, var(--accent-purple) ${pct * 3.6}deg, var(--bg-pill) ${pct * 3.6}deg 360deg); border: 2px solid var(--border-glass); box-shadow: 0 0 15px rgba(56,189,248,0.25);">${pct}%</div>
                <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">Match</span>
            `;
        } else {
            scoreSec.innerHTML = `
                <span class="match-tag" style="background:rgba(255,255,255,0.05); color:var(--text-secondary);">No Resume</span>
            `;
        }
        
        header.appendChild(titleSec);
        header.appendChild(scoreSec);
        card.appendChild(header);
        
        // JD snippet
        const jdSnippet = document.createElement("div");
        jdSnippet.style.fontSize = "0.88rem";
        jdSnippet.style.color = "var(--text-secondary)";
        jdSnippet.style.lineHeight = "1.6";
        jdSnippet.style.background = "rgba(7, 10, 18, 0.6)";
        jdSnippet.style.border = "1px solid rgba(255,255,255,0.05)";
        jdSnippet.style.padding = "1rem 1.2rem";
        jdSnippet.style.borderRadius = "12px";
        jdSnippet.innerText = job.jd.length > 260 ? job.jd.slice(0, 260) + "..." : job.jd;
        card.appendChild(jdSnippet);
        
        // Ghost Score Alert
        if (job.ghost_report && job.ghost_report.ghost_score >= 35.0) {
            const ghostAlert = document.createElement("div");
            ghostAlert.style.background = "rgba(244, 63, 94, 0.05)";
            ghostAlert.style.border = "1px solid rgba(244, 63, 94, 0.15)";
            ghostAlert.style.padding = "0.6rem 0.8rem";
            ghostAlert.style.borderRadius = "8px";
            ghostAlert.style.fontSize = "0.78rem";
            ghostAlert.style.color = "var(--accent-rose)";
            ghostAlert.innerHTML = `<i class="fa-solid fa-ghost"></i> <strong>Ghost-Job Alert (${job.ghost_report.ghost_score}%):</strong> ${job.ghost_report.indicators.join(" | ")}`;
            card.appendChild(ghostAlert);
        }
        
        // Skills matched/missing
        if (hasResume && hasResume.trim().length > 20 && (skillsMatched.length > 0 || skillsMissing.length > 0)) {
            const skillsSec = document.createElement("div");
            skillsSec.style.display = "flex";
            skillsSec.style.flexWrap = "wrap";
            skillsSec.style.gap = "0.5rem";
            
            skillsMatched.slice(0, 5).forEach(s => {
                skillsSec.innerHTML += `<span class="skill-badge matched" style="font-size:0.75rem;"><i class="fa-solid fa-square-check"></i> ${s}</span>`;
            });
            skillsMissing.slice(0, 5).forEach(s => {
                skillsSec.innerHTML += `<span class="skill-badge missing" style="font-size:0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${s}</span>`;
            });
            
            card.appendChild(skillsSec);
        }
        
        // Actions
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "space-between";
        actions.style.alignItems = "center";
        actions.style.marginTop = "0.5rem";
        
        actions.innerHTML = `
            <a href="${job.url}" target="_blank" class="resource-link" style="font-size:0.85rem;">
                <i class="fa-solid fa-up-right-from-square"></i> View Original Listing
            </a>
            <div style="display:flex; gap:0.8rem;">
                <button class="custom-button" id="btn-add-pipeline-${idx}" style="padding:0.6rem 1.4rem; font-size:0.85rem; border-radius:10px;">
                    <i class="fa-solid fa-plus"></i> Import & Evaluate Role
                </button>
            </div>
        `;
        card.appendChild(actions);
        listContainer.appendChild(card);
        
        // Add to pipeline logic
        document.getElementById(`btn-add-pipeline-${idx}`).onclick = () => {
            // Fill details in RAG Matcher tab
            document.getElementById("jd-company").value = job.company;
            document.getElementById("jd-role").value = job.role;
            document.getElementById("jd-text").value = job.jd;
            document.getElementById("jd-url").value = job.url;
            
            currentJdText = job.jd;
            
            // Switch to RAG tab and alert
            switchTab("tab-rag", document.querySelector('[onclick*="tab-rag"]'));
            alert(`Job filled in Multi-Agent Matcher tab! Feel free to run matching or cover-letter agents now.`);
        };
    });
}

// --- THEME ENGINE (LIGHT & DARK MODE) ---
function initTheme() {
    const savedTheme = localStorage.getItem('smartapply-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('smartapply-theme', newTheme);
    updateThemeIcon(newTheme);
    console.log("Theme switched to:", newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        if (theme === 'light') {
            icon.className = 'fa-solid fa-moon';
            icon.style.color = 'var(--accent-purple)';
        } else {
            icon.className = 'fa-solid fa-sun';
            icon.style.color = 'var(--accent-amber)';
        }
    }
}

// Explicitly bind to window object for HTML onclick compatibility
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.updateThemeIcon = updateThemeIcon;

// Initialize theme immediately
initTheme();

// --- AI-TAILORED RESUME ENGINE (MATCHER & KANBAN) ---
function copyTailoredResume() {
    const textarea = document.getElementById("result-tailored-resume");
    if (!textarea || !textarea.value) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
        alert("Tailored Resume copied to clipboard! Ready to paste into application or Word/Docs.");
    }).catch(() => {
        textarea.select();
        document.execCommand("copy");
        alert("Tailored Resume copied to clipboard!");
    });
}

async function openTailoredResumeModal(company, role, jdText) {
    const modal = document.getElementById("resume-modal-overlay");
    if (!modal) return;
    modal.style.display = "flex";
    
    document.getElementById("modal-resume-title").innerText = `AI-Tailored Resume: ${company} - ${role}`;
    document.getElementById("modal-tailored-textarea").value = `Generating ATS-optimized resume for ${company} (${role})...\nAnalyzing target job competencies and injecting keywords into your original resume format...`;
    
    const resumeText = document.getElementById("resume-text") ? document.getElementById("resume-text").value : "";
    
    try {
        const res = await fetch("/api/generate-tailored-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resume_text: resumeText,
                jd_text: jdText || "",
                company: company,
                role: role
            })
        });
        const data = await res.json();
        
        if (data && data.tailored_resume) {
            document.getElementById("modal-tailored-textarea").value = data.tailored_resume;
            
            const skillsContainer = document.getElementById("modal-resume-skills");
            if (skillsContainer && data.missing_skills_injected) {
                skillsContainer.innerHTML = `<span class="match-tag" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.3);">ATS Aligned: 96%</span> <span class="match-tag" style="background: rgba(56, 189, 248, 0.2); color: #fff; border: 1px solid var(--primary-glow); margin-left: 0.4rem;">Ready for PDF Download</span>`;
                data.missing_skills_injected.slice(0, 4).forEach(s => {
                    skillsContainer.innerHTML += `<span class="skill-badge matched" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;"><i class="fa-solid fa-check-double"></i> Injected: ${s}</span>`;
                });
            }
        } else {
            document.getElementById("modal-tailored-textarea").value = "Failed to generate tailored resume. Please check server logs.";
        }
    } catch (e) {
        document.getElementById("modal-tailored-textarea").value = `Error generating tailored resume: ${e.message}`;
    }
}

function closeTailoredResumeModal() {
    const modal = document.getElementById("resume-modal-overlay");
    if (modal) modal.style.display = "none";
}

function copyModalTailoredResume() {
    const textarea = document.getElementById("modal-tailored-textarea");
    if (!textarea || !textarea.value) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
        alert("Tailored Resume copied to clipboard!");
    }).catch(() => {
        textarea.select();
        document.execCommand("copy");
        alert("Tailored Resume copied to clipboard!");
    });
}

window.copyTailoredResume = copyTailoredResume;
window.openTailoredResumeModal = openTailoredResumeModal;
window.closeTailoredResumeModal = closeTailoredResumeModal;
window.copyModalTailoredResume = copyModalTailoredResume;

async function downloadTailoredResumePDF(isModal = false) {
    const textarea = document.getElementById(isModal ? "modal-tailored-textarea" : "result-tailored-resume");
    if (!textarea || !textarea.value) {
        alert("Please wait for the resume to generate before downloading!");
        return;
    }
    
    let company = "Company";
    let role = "Role";
    if (isModal) {
        const titleEl = document.getElementById("modal-resume-title");
        if (titleEl && titleEl.innerText.includes(": ")) {
            const parts = titleEl.innerText.split(": ")[1].split(" - ");
            company = parts[0] || "Company";
            role = parts[1] || "Role";
        }
    } else {
        const companyEl = document.getElementById("jd-company") || document.getElementById("result-company-role");
        const roleEl = document.getElementById("jd-role");
        if (companyEl) company = companyEl.value || companyEl.innerText || "Company";
        if (roleEl) role = roleEl.value || roleEl.innerText || "Role";
    }
    
    const btn = event ? event.currentTarget : null;
    const oldText = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...`;
    
    try {
        const res = await fetch("/api/download-tailored-resume-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tailored_resume: textarea.value,
                company: company,
                role: role
            })
        });
        
        if (!res.ok) throw new Error("Server failed to generate PDF document.");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cleanCompany = company.replace(/[^a-zA-Z0-9]/g, "_");
        const cleanRole = role.replace(/[^a-zA-Z0-9]/g, "_");
        a.download = `${cleanCompany}_${cleanRole}_Tailored_Resume.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("PDF Generation error: " + e.message);
    } finally {
        if (btn) btn.innerHTML = oldText || `<i class="fa-solid fa-file-pdf"></i> Download (.PDF)`;
    }
}

function downloadModalTailoredResumePDF() {
    return downloadTailoredResumePDF(true);
}

window.downloadTailoredResumePDF = downloadTailoredResumePDF;
window.downloadModalTailoredResumePDF = downloadModalTailoredResumePDF;
