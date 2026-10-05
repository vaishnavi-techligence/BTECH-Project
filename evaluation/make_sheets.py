import pandas as pd, numpy as np

# jds: DataFrame [jd_id, jd_text]; resumes: DataFrame [resume_id, resume_text]
jds = pd.read_csv("jds.csv"); resumes = pd.read_csv("resumes.csv")
rng = np.random.default_rng(42)
K = 8   # resumes per JD

rows = []
for jd_id in jds.jd_id:
    for rid in rng.choice(resumes.resume_id, K, replace=False):
        rows.append({"jd_id": jd_id, "resume_id": rid})
pairs = pd.DataFrame(rows)

# one sheet per labeler, shuffled independently; ratings blank
for name in ["labeler1", "labeler2"]:
    sheet = pairs.sample(frac=1, random_state=hash(name) % 1000).copy()
    sheet["rating_1to5"] = ""      # 1=clearly unfit ... 5=strong hire-worthy fit
    sheet["notes"] = ""
    sheet.to_csv(f"{name}_sheet.csv", index=False)

pairs.to_csv("pairs_master.csv", index=False)
