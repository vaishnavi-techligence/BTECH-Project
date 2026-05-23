// State management
let currentResumeText = "";
let currentJdText = "";
let currentUploadedSkills = [];
let applicationsList = [];

// DOM elements
const loadingOverlay = document.getElementById("loading-overlay");

document.addEventListener("DOMContentLoaded", () => {
    // Initial sync
    refreshDashboardData();
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
        title.innerText = "System Diagnostics Hub";
        subtitle.innerText = "Goal Completion Rates (GCR), resilience performance, and AFLOW prompt efficiency indices.";
    } else if (tabId === "tab-kanban") {
        title.innerText = "Kanban Application Pipeline";
        subtitle.innerText = "Interactive tracking board with drag-and-drop statuses synchronized with SQLite database.";
    } else if (tabId === "tab-rag") {
        title.innerText = "Multi-Agent Deep RAG Matcher";
        subtitle.innerText = "Skill-Decomposed Weighted matching, Dual-ATS anonymization screening, and learning recommendations.";
    } else if (tabId === "tab-scheduler") {
        title.innerText = "Chronological Scheduler";
        subtitle.innerText = "Scheduled application time windows targeting historical peak response rates.";
    } else if (tabId === "tab-graph") {
        title.innerText = "Career Mobility Trajectory Graph";
        subtitle.innerText = "Deep co-occurrence analytics tracing standard engineering career path transitions.";
    } else if (tabId === "tab-crawler") {
        title.innerText = "Online Job Crawler & Multi-Match Engine";
        subtitle.innerText = "Crawl public developer directories, scrape active descriptions, and batch-evaluate resume match ratios.";
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
        rateText.style.color = "#fff";
        
        const bar = document.createElement("div");
        bar.style.width = "40px";
        bar.style.height = `0%`;
        bar.style.background = `linear-gradient(to top, var(--bg-main), ${color})`;
        bar.style.borderRadius = "6px 6px 0 0";
        bar.style.boxShadow = `0 0 10px ${color}33`;
        bar.style.transition = "height 1s cubic-bezier(0.4, 0, 0.2, 1)";
        
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
    circle.style.background = `radial-gradient(circle, var(--bg-main) 60%, transparent 100%), conic-gradient(var(--primary-glow) 0deg, var(--accent-purple) ${percent * 3.6}deg)`;

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
                <div>
                  <div style="font-size:0.85rem; font-weight:600; color:#fff;">Missing: ${c.skill} <span style="color:var(--accent-rose); font-size:0.75rem;">(Impact: ${c.impact_score})</span></div>
                  <div style="font-size:0.75rem; color:var(--text-secondary);">${c.recommendation}</div>
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
              <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.8rem;">
                ${app.status === 'matched' ? `<button onclick="runScheduling(${app.id})" style="padding:0.2rem 0.5rem; font-size:0.7rem; border-radius:4px; border:1px solid var(--border-glass); background:rgba(139,92,246,0.15); color:var(--accent-purple); cursor:pointer;">Schedule</button>` : ''}
                ${app.status === 'scheduled' ? `<button onclick="runInstantApplication(${app.id})" style="padding:0.2rem 0.5rem; font-size:0.7rem; border-radius:4px; border:1px solid var(--border-glass); background:rgba(26,210,255,0.15); color:var(--primary-glow); cursor:pointer;">Apply Now</button>` : ''}
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
            <td style="padding:1rem; text-align:right;">
              <button onclick="runInstantApplication(${a.id})" class="custom-button" style="padding:0.4rem 0.8rem; font-size:0.78rem; display:inline-flex; box-shadow:none;">
                Trigger Submission
              </button>
            </td>
          </tr>
        `;
    });
}

// 10. RENDER MOBILITY TRAJECTORY GRAPH (Innovation 5)
function renderMobilityGraph(data) {
    const container = document.getElementById("graph-container");
    container.innerHTML = "";
    
    // Position coordinates for high-fidelity visual presentability
    const nodeCoords = {
        "Python": { x: 100, y: 150, type: "skill" },
        "PyTorch": { x: 80, y: 280, type: "skill" },
        "CUDA": { x: 220, y: 350, type: "skill" },
        "Docker": { x: 380, y: 80, type: "skill" },
        "SQL": { x: 240, y: 70, type: "skill" },
        "RAG": { x: 320, y: 220, type: "skill" },
        "Junior SDE": { x: 550, y: 300, type: "role" },
        "Software Development Engineer": { x: 500, y: 170, type: "role" },
        "Data Scientist": { x: 420, y: 320, type: "role" },
        "Machine Learning Engineer": { x: 680, y: 250, type: "role" },
        "Senior Research Scientist": { x: 720, y: 120, type: "role" },
        "Tech Lead": { x: 620, y: 70, type: "role" }
    };

    // Draw SVG connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "450");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.zIndex = "1";
    container.appendChild(svg);

    // Draw connecting paths (Edges)
    data.forEach(edge => {
        const start = nodeCoords[edge.source];
        const end = nodeCoords[edge.target];
        
        if (start && end) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            
            // Draw a beautiful curved line
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // curvature
            
            line.setAttribute("d", `M${start.x},${start.y} A${dr},${dr} 0 0,1 ${end.x},${end.y}`);
            line.setAttribute("stroke", edge.type === "skill-to-role" ? "rgba(26, 210, 255, 0.15)" : "rgba(139, 92, 246, 0.2)");
            line.setAttribute("stroke-width", Math.min(6, 1 + edge.weight / 6));
            line.setAttribute("fill", "none");
            line.setAttribute("marker-end", "url(#arrow)");
            
            // Subtle glow hover
            line.onmouseover = () => {
                line.setAttribute("stroke", "rgba(26, 210, 255, 0.6)");
                line.setAttribute("stroke-width", "4");
            };
            line.onmouseout = () => {
                line.setAttribute("stroke", edge.type === "skill-to-role" ? "rgba(26, 210, 255, 0.15)" : "rgba(139, 92, 246, 0.2)");
                line.setAttribute("stroke-width", Math.min(6, 1 + edge.weight / 6));
            };
            
            svg.appendChild(line);
        }
    });

    // Draw nodes on top
    for (let name in nodeCoords) {
        const coord = nodeCoords[name];
        const node = document.createElement("div");
        node.className = "node-group";
        node.style.left = `${coord.x - 50}px`;
        node.style.top = `${coord.y - 15}px`;
        node.style.zIndex = "5";
        
        if (coord.type === "skill") {
            node.style.borderLeft = "3px solid var(--primary-glow)";
            node.innerHTML = `<i class="fa-solid fa-code" style="color:var(--primary-glow); margin-right:5px;"></i> ${name}`;
        } else {
            node.style.borderLeft = "3px solid var(--accent-purple)";
            node.innerHTML = `<i class="fa-solid fa-briefcase" style="color:var(--accent-purple); margin-right:5px;"></i> ${name}`;
        }
        
        node.onclick = () => {
            alert(`Trajectory Node: '${name}'\nLinked paths: Trace active job requirements matching this trajectory category.`);
        };
        
        container.appendChild(node);
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
        card.style.padding = "1.5rem";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "1rem";
        card.style.background = "rgba(255,255,255,0.01)";
        card.style.border = "1px solid var(--border-glass)";
        card.style.borderRadius = "12px";
        card.style.marginBottom = "1.5rem";
        
        // Header
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "flex-start";
        
        const titleSec = document.createElement("div");
        titleSec.innerHTML = `
            <h4 style="font-size:1.15rem; color:#fff; margin-bottom:0.25rem;">${job.role}</h4>
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
                <div style="width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-weight: 700; color: #fff; background: radial-gradient(circle, var(--bg-main) 60%, transparent 100%), conic-gradient(${pct >= 70 ? 'var(--accent-emerald)' : 'var(--primary-glow)'} 0deg, var(--accent-purple) ${pct * 3.6}deg); border: 1px solid var(--border-glass); box-shadow: 0 0 10px rgba(139,92,246,0.2);">${pct}%</div>
                <span style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.3rem;">match</span>
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
        jdSnippet.style.fontSize = "0.85rem";
        jdSnippet.style.color = "var(--text-secondary)";
        jdSnippet.style.lineHeight = "1.5";
        jdSnippet.style.background = "rgba(0,0,0,0.15)";
        jdSnippet.style.padding = "0.8rem";
        jdSnippet.style.borderRadius = "8px";
        jdSnippet.innerText = job.jd.length > 240 ? job.jd.slice(0, 240) + "..." : job.jd;
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
            <a href="${job.url}" target="_blank" style="font-size:0.82rem; color:var(--primary-glow); text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Original Job Listing
            </a>
            <div style="display:flex; gap:0.8rem;">
                <button class="custom-button" id="btn-add-pipeline-${idx}" style="padding:0.5rem 1rem; font-size:0.78rem; background:linear-gradient(135deg, var(--accent-purple), var(--accent-purple)); box-shadow:none;">
                    <i class="fa-solid fa-plus"></i> Import & Match Job
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

