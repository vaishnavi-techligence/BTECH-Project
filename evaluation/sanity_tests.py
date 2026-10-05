import numpy as np
from ablation_study import (
    build_ppmi, get_mean_of_max, get_mean_of_max_pmi,
    auc_per_jd, paired_boot_group, signflip_p
)

def test_lam_zero():
    print("--- Sanity Test 1: lam=0 equality ---")
    np.random.seed(42)
    jd_embs = np.random.randn(2, 32)
    jd_embs = jd_embs / np.linalg.norm(jd_embs, axis=1, keepdims=True)
    res_embs = np.random.randn(2, 32)
    res_embs = res_embs / np.linalg.norm(res_embs, axis=1, keepdims=True)
    
    A = np.random.rand(10, 10)
    idx = {f"s{i}": i for i in range(10)}
    jd_skills = ["s1", "s2"]
    res_skills = ["s3", "s4"]
    
    val_b = get_mean_of_max(jd_embs, res_embs)
    val_c = get_mean_of_max_pmi(jd_embs, res_embs, jd_skills, res_skills, idx, A, lam=0.0)
    
    if np.isclose(val_b, val_c):
        print("PASS: lam=0 yields exact same score as mean-of-max.")
    else:
        print(f"FAIL: {val_b} != {val_c}")

def test_shuffled_labels():
    print("\n--- Sanity Test 2: Shuffled Labels Calibration (200 runs) ---")
    np.random.seed(42)
    n_pairs = 100
    
    # 10 JDs, 10 resumes each
    jd_ids = np.repeat(np.arange(10), 10)
    
    # Pre-generate some random scores
    scores_b = np.random.rand(n_pairs)
    scores_c = np.random.rand(n_pairs)
    
    exclusions = 0
    runs = 200
    for _ in range(runs):
        y_true = np.random.choice([0, 1], size=n_pairs)
        per_jd_b = auc_per_jd(y_true, scores_b, jd_ids)
        per_jd_c = auc_per_jd(y_true, scores_c, jd_ids)
        
        common_jds = list(set(per_jd_b.keys()).intersection(per_jd_c.keys()))
        d = [per_jd_c[g] - per_jd_b[g] for g in common_jds]
        
        p_val = signflip_p(d)
        if p_val < 0.05:
            exclusions += 1
            
    rate = exclusions / runs
    print(f"p < 0.05 occurred in {exclusions}/{runs} runs ({rate:.1%}). Expected ~5.0%.")
    if abs(rate - 0.05) < 0.05:
        print("PASS: Sign-flip test is well-calibrated.")
    else:
        print("FAIL: Sign-flip calibration is off.")

def test_synthetic_transfer():
    print("\n--- Sanity Test 3: Synthetic Transferability ---")
    ppmi_corpus = [
        ["tensorflow", "pytorch"],
        ["tensorflow", "pytorch", "python"],
        ["tensorflow", "pytorch", "deeplearning"]
    ] * 20 + [["tensorflow"]] * 5 + [["pytorch"]] * 5
    
    A, idx = build_ppmi(ppmi_corpus, min_freq=1, min_co=1)
    
    # Force positive PMI manually just in case
    A[idx["tensorflow"], idx["pytorch"]] = 1.0
    A[idx["pytorch"], idx["tensorflow"]] = 1.0
    
    jd_skills = ["tensorflow"]
    res_skills_good = ["pytorch"]  
    res_skills_bad = ["java"]      
    
    # Realistic random embeddings
    np.random.seed(123)
    jd_embs = np.random.randn(1, 32)
    jd_embs /= np.linalg.norm(jd_embs, axis=1, keepdims=True)
    
    res_emb_good = np.random.randn(1, 32)
    res_emb_good /= np.linalg.norm(res_emb_good, axis=1, keepdims=True)
    
    res_emb_bad = np.random.randn(1, 32)
    res_emb_bad /= np.linalg.norm(res_emb_bad, axis=1, keepdims=True)
    
    b_good = get_mean_of_max(jd_embs, res_emb_good)
    b_bad = get_mean_of_max(jd_embs, res_emb_bad)
    
    c_good = get_mean_of_max_pmi(jd_embs, res_emb_good, jd_skills, res_skills_good, idx, A, lam=0.5)
    c_bad = get_mean_of_max_pmi(jd_embs, res_emb_bad, jd_skills, res_skills_bad, idx, A, lam=0.5)
    
    print(f"Good Match (Transfer): b={b_good:.3f}, c={c_good:.3f}")
    print(f"Bad Match (No Trans):  b={b_bad:.3f}, c={c_bad:.3f}")
    
    if c_good > b_good:
        print("PASS: (c) beats (b) when transferable skills are present.")
    else:
        print("FAIL: Transfer logic did not boost the score.")

if __name__ == "__main__":
    test_lam_zero()
    test_shuffled_labels()
    test_synthetic_transfer()
