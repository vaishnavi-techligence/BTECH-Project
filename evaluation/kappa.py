import pandas as pd, numpy as np
from sklearn.metrics import cohen_kappa_score

a = pd.read_csv("labeler1_sheet.csv"); b = pd.read_csv("labeler2_sheet.csv")
m = a.merge(b, on=["jd_id", "resume_id"], suffixes=("_1", "_2"))

r1, r2 = m.rating_1to5_1.astype(int), m.rating_1to5_2.astype(int)
print("Weighted kappa (1-5, quadratic):", round(cohen_kappa_score(r1, r2, weights="quadratic"), 3))

b1, b2 = (r1 >= 4).astype(int), (r2 >= 4).astype(int)
print("Kappa (binary, >=4 good):     ", round(cohen_kappa_score(b1, b2), 3))
print("Raw agreement (binary):       ", round((b1 == b2).mean(), 3))

# disagreements go to a third pass (discuss or a 3rd labeler)
dis = m[b1 != b2][["jd_id", "resume_id", "rating_1to5_1", "rating_1to5_2"]]
dis.to_csv("to_adjudicate.csv", index=False)
print(len(dis), "pairs need adjudication")

# final label: agreement keeps the label; disagreements filled in later
m["label"] = np.where(b1 == b2, b1, np.nan)
m[["jd_id", "resume_id", "label"]].to_csv("labels_partial.csv", index=False)
