import numpy as np, itertools
from sklearn.metrics import roc_auc_score, ndcg_score
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

def build_ppmi(jd_skill_lists, min_freq=5, min_co=3):
    cnt = {}
    for sk in jd_skill_lists:
        for s in set(sk): cnt[s] = cnt.get(s, 0) + 1
    vocab = sorted(s for s, c in cnt.items() if c >= min_freq)
    idx = {s: i for i, s in enumerate(vocab)}
    X = np.zeros((len(jd_skill_lists), len(vocab)))
    for r, sk in enumerate(jd_skill_lists):
        for s in set(sk):
            if s in idx: X[r, idx[s]] = 1
    C = X.T @ X; N = len(X); c = np.diag(C).copy()
    with np.errstate(divide="ignore", invalid="ignore"):
        pmi = np.log2(C * N / np.outer(c, c))
    A = np.where(C >= min_co, np.maximum(pmi, 0), 0)
    np.fill_diagonal(A, 0)
    A = np.nan_to_num(A)
    if A.max() > 0: A /= A.max()
    return A, idx

def ndcg_per_jd(y, s, jd_ids, k=5):
    out = {}
    for g in np.unique(jd_ids):
        m = jd_ids == g
        if m.sum() >= 2 and len(set(y[m])) == 2:
            out[g] = ndcg_score([y[m]], [s[m]], k=k)
    return out

def auc_per_jd(y, s, jd_ids):
    out = {}
    for g in np.unique(jd_ids):
        m = jd_ids == g
        if len(set(y[m])) == 2:
            out[g] = roc_auc_score(y[m], s[m])
    return out

def signflip_p(d, n_mc=20000, seed=0):
    d = np.asarray(d, float); n = len(d); obs = abs(d.mean())
    if n <= 15:   # exact
        signs = np.array(list(itertools.product([-1, 1], repeat=n)))
        null = np.abs((signs * d).mean(axis=1))
    else:         # Monte Carlo
        rng = np.random.default_rng(seed)
        null = np.abs((rng.choice([-1, 1], (n_mc, n)) * d).mean(axis=1))
    return (null >= obs - 1e-12).mean()   # two-sided p-value

def paired_boot_group(per_jd_a, per_jd_b, n=2000, seed=0):
    common_jds = list(set(per_jd_a.keys()).intersection(per_jd_b.keys()))
    if not common_jds:
        return (0, 0, 0)
    d = np.array([per_jd_b[g] - per_jd_a[g] for g in common_jds])
    rng = np.random.default_rng(seed)
    m = [d[rng.integers(0, len(d), len(d))].mean() for _ in range(n)]
    return np.percentile(m, [2.5, 50, 97.5])

def tune_lam(val_score_fn, y_val, jd_val, lams=(0, .05, .1, .2, .3, .5)):
    best_lam = 0
    best_score = -1
    for l in lams:
        s_val = val_score_fn(l)
        aucs = list(auc_per_jd(y_val, s_val, jd_val).values())
        score = np.mean(aucs) if aucs else 0
        if score > best_score:
            best_score = score
            best_lam = l
    return best_lam

def get_blob_cosine(jd_embs, res_embs):
    jd_mean = np.mean(jd_embs, axis=0)
    jd_mean = jd_mean / (np.linalg.norm(jd_mean) + 1e-9)
    res_mean = np.mean(res_embs, axis=0)
    res_mean = res_mean / (np.linalg.norm(res_mean) + 1e-9)
    return np.dot(jd_mean, res_mean)

def get_mean_of_max(jd_embs, res_embs):
    S = jd_embs @ res_embs.T
    return np.mean(np.max(S, axis=1))

def get_mean_of_max_pmi(jd_embs, res_embs, jd_skills, res_skills, idx, A, lam=0.2):
    S = jd_embs @ res_embs.T
    jd_ids = [idx.get(sk, -1) for sk in jd_skills]
    res_ids = [idx.get(sk, -1) for sk in res_skills]
    
    A_sub = np.zeros((len(jd_skills), len(res_skills)))
    for i, j_idx in enumerate(jd_ids):
        for j, r_idx in enumerate(res_ids):
            if j_idx != -1 and r_idx != -1:
                A_sub[i, j] = A[j_idx, r_idx]
                
    S2 = np.clip(S + lam * A_sub, 0, 1)
    return np.mean(np.max(S2, axis=1))
