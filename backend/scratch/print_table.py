import json

data = json.load(open("scratch/adaptive_simulation_results.json"))
print(f"{'SCENARIO':<48} | {'CEIL 10':<8} | {'CEIL 12':<8} | {'CEIL 15':<8} | {'SUFF TURN':<10} | {'HIT 10?':<8}")
print("-" * 105)
for k, v in data["res_10"].items():
    v12 = data["res_12"][k]
    v15 = data["res_15"][k]
    suff = str(v["sufficiency_turn"]) if v["sufficiency_turn"] is not None else "None"
    hit = "YES" if v["max_q_reached"] else "no"
    print(f"{k:<48} | {v['total_questions_asked']:<8} | {v12['total_questions_asked']:<8} | {v15['total_questions_asked']:<8} | {suff:<10} | {hit:<8}")
