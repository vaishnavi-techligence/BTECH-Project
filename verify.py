import os
import sys
import numpy as np

# Adjust path to enable absolute imports from parent directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.models import init_db, get_db_connection
from rag_engine.matcher import SkillDecomposedMatcher, calculate_recos_similarity, calculate_cosine_similarity
from llm_module.generator import AgenticLLMEngine
from job_scraper.scraper import CareerPortalScraper
from automation.applier import AutomatedApplier
from evaluation.metrics import EvaluatorMetrics

def print_banner(text):
    print("\n" + "=" * 60)
    print(f" {text.upper()} ")
    print("=" * 60)

def run_tests():
    print_banner("SmartApply — Validation Test Suite")
    
    # 1. DATABASE TESTING
    print("\n[TEST 1] Initializing SQLite database layer...")
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM applications")
        app_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM career_knowledge_graph")
        graph_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM prompt_performance")
        prompt_count = cursor.fetchone()[0]
        
    print(f" -> Applications seeded: {app_count} records")
    print(f" -> Career mobility edges seeded: {graph_count} records")
    print(f" -> AFLOW prompt logs seeded: {prompt_count} records")
    assert app_count > 0, "Applications seeding validation failed."
    assert graph_count > 0, "Knowledge Graph seeding validation failed."
    print(" -> SQLite integrity checks: PASSED")

    # 2. MATCHING ENGINE TESTING
    print("\n[TEST 2] Executing Vector Similarity and Skill-Decomposed Matching...")
    matcher = SkillDecomposedMatcher()
    
    # Cosine vs Recos Similarity Math Check
    vec1 = np.array([0.1, 0.9, 0.0, 0.4])
    vec2 = np.array([0.15, 0.85, 0.1, 0.38])
    cos_sim = calculate_cosine_similarity(vec1, vec2)
    recos_sim = calculate_recos_similarity(vec1, vec2)
    
    print(f" -> Math check: Cosine Similarity = {cos_sim:.4f}")
    print(f" -> Math check: Recos Rank Similarity = {recos_sim:.4f}")
    assert abs(cos_sim - 1.0) < 0.1, "Cosine similarity arithmetic failed."
    assert recos_sim > 0.0, "Recos similarity arithmetic failed."
    
    # SDWM Match Check
    resume = "Deep learning specialist with expertise in Python, PyTorch, and SQL."
    jd = "Need a software engineer. Essential: Python, PyTorch, CUDA, SQL. Nice-to-have: AWS."
    match_report = matcher.compute_sdwm_match(resume, jd)
    
    print(f" -> SDWM Score: {match_report['final_score']}")
    print(f" -> Core Skills Matched: {match_report['core_skills_matched']}")
    print(f" -> Core Skills Missing: {match_report['core_skills_missing']}")
    print(f" -> Counterfactual explanations generated: {len(match_report['counterfactuals'])}")
    assert match_report['final_score'] > 0.0, "SDWM matching engine failed."
    print(" -> Matching engine pipeline: PASSED")

    # 3. LLM AND AGENTIC PIPELINE
    print("\n[TEST 3] Running Sequential 4-Agent Pipeline & AI Stripper...")
    engine = AgenticLLMEngine()
    
    # Anonymization
    resume_raw = "Alex Smith graduated from Stanford University and worked at Google Inc. He wrote CUDA pipelines."
    anon_out = engine.anonymize_resume(resume_raw)
    print(f" -> Anonymized preview: {anon_out}")
    assert "[Candidate Name]" in anon_out, "Candidate name anonymizer failed."
    assert "[Tier-1 Technical University]" in anon_out, "University name anonymizer failed."
    assert "[FAANG Technology Corporation]" in anon_out, "Company name anonymizer failed."
    
    # AI Fingerprint Neutraliser
    robotic_text = "Furthermore, I am thrilled to align with your team. In conclusion, this project is a testament to my skills."
    human_text = engine.neutralise_ai_fingerprints(robotic_text)
    print(f" -> Neutralised preview: {human_text}")
    assert "Furthermore" not in human_text, "AI Self-Preference Neutraliser failed to strip transitional terms."
    assert "In conclusion" not in human_text, "AI Self-Preference Neutraliser failed to strip conclusions."
    
    # Template AFLOW optimizer check
    best_name, _ = engine.get_optimal_template()
    print(f" -> AFLOW Optimizer chosen template: {best_name}")
    
    # Sequential Pipeline execution
    pipeline_res = engine.run_agentic_pipeline(resume, jd, "Meta", "ML Engineer")
    print(f" -> Cover letter length: {len(pipeline_res['cover_letter'])} characters")
    print(f" -> Calculated Fairness Delta: {pipeline_res['bias_report']['fairness_delta']}%")
    print(f" -> Sequential Extractor agent: {pipeline_res['agents_log']['extractor_status']}")
    print(f" -> Sequential Formatter agent: {pipeline_res['agents_log']['formatter_status']}")
    assert len(pipeline_res['cover_letter']) > 100, "Sequential Multi-Agent Cover Letter generator failed."
    print(" -> Agentic LLM layer: PASSED")

    # 4. SCRAPER & AUTOMATION TESTING
    print("\n[TEST 4] Scraping career portals and calculating Vacancy Ghost Score...")
    scraper = CareerPortalScraper()
    applier = AutomatedApplier()
    
    # Scrape and Ghost check
    job_url = "https://careers.netflix.com/jobs/senior-data-scientist"
    scraped_job = scraper.fetch_job_details(job_url)
    print(f" -> Guess Company: {scraped_job['company']}")
    print(f" -> Guess Role: {scraped_job['role']}")
    print(f" -> Vacancy Ghost Score: {scraped_job['ghost_report']['ghost_score']}%")
    print(f" -> Ghost Diagnosis: {scraped_job['ghost_report']['status']}")
    assert scraped_job['ghost_report']['ghost_score'] > 0.0, "Ghost Job Detector computation failed."
    
    # Playwright Emulator submission check
    apply_res = applier.submit_application(
        company=scraped_job["company"],
        role=scraped_job["role"],
        cover_letter=pipeline_res["cover_letter"],
        resume_path="simulated_resume.pdf",
        url=job_url
    )
    print(f" -> Emulator submission status: {apply_res['status']}")
    print(f" -> Logs compiled: {len(apply_res['logs'])} console steps")
    assert apply_res['status'] == "success", "Playwright auto-applier simulator failed."
    print(" -> Scraping & Automation pipeline: PASSED")

    # 5. DIAGNOSTICS & EVALUATIONS TESTING
    print("\n[TEST 5] Analyzing Evaluation metrics & Geometric Entropy...")
    evaluator = EvaluatorMetrics()
    
    # nDCG@5 calculation
    pred_rel = [5.0, 4.0, 2.0, 1.0, 0.0]
    ideal_rel = [5.0, 5.0, 4.0, 3.0, 2.0]
    ndcg = evaluator.calculate_ndcg_at_5(pred_rel, ideal_rel)
    print(f" -> Math check: Normalized Gain nDCG@5 = {ndcg:.4f}")
    assert ndcg > 0.0, "nDCG@5 calculation failed."
    
    # Intrinsic Dimensionality calculation
    dim_res = evaluator.calculate_intrinsic_dimensionality(pipeline_res['cover_letter'])
    print(f" -> Math check: Participation Ratio Intrinsic Dimension = {dim_res['intrinsic_dim']}")
    print(f" -> Math check: Calculated Robotic AI Index = {dim_res['robotic_index']}%")
    print(f" -> Complexity Verdict: {dim_res['verdict']}")
    assert dim_res['intrinsic_dim'] > 0.0, "Eigenvalue-based Intrinsic Dimensionality failed."
    
    # GCR and MTR Check
    agent_eff = evaluator.calculate_agent_efficiency(8, 10, 1)
    print(f" -> Calculated Goal Completion Rate: {agent_eff['gcr_percentage']}%")
    print(f" -> Calculated Multi-Step Resilience: {agent_eff['mtr_percentage']}%")
    assert agent_eff['gcr_percentage'] == 80.0, "GCR computation math failed."
    print(" -> Evaluation metrics suite: PASSED")

    print_banner("All Core Pipelines successfully verified! System is fully presentable!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n[FAILURE] Validation test suite threw an error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
