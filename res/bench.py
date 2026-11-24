"""Modeltest: sender to spørgsmål med Simons systemprompt og måler tid. Brug: python res/bench.py backend <model>"""
import sys, json
sys.path.insert(0, sys.argv[1]); sys.stdout.reconfigure(encoding="utf-8")
import server
from urllib.request import Request, urlopen
model = sys.argv[2]
sysmsg = server.load_system_prompt()
for q in ["Min printer virker ikke", "Hvordan opdaterer jeg driveren til mit grafikkort?"]:
    body = {"model": model, "stream": False, "think": False,
            "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": q}]}
    r = json.loads(urlopen(Request("http://127.0.0.1:11434/api/chat", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST"), timeout=900).read())
    pe, pd = r.get("prompt_eval_count", 0), r.get("prompt_eval_duration", 1) / 1e9
    ec, ed = r.get("eval_count", 0), r.get("eval_duration", 1) / 1e9
    print(f"\n##### {model} | {q}\nTOTAL {r['total_duration']/1e9:.0f}s | load {r.get('load_duration',0)/1e9:.0f}s | prompt {pe} tok @ {pe/pd:.0f} tok/s | svar {ec} tok @ {ec/ed:.1f} tok/s")
    print(r["message"].get("content", ""))
