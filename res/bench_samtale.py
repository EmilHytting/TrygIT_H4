"""Modeltest: opfølgende spørgsmål i en samtale. Brug: python res/bench_samtale.py backend <model> [<model> ...]"""
import sys, json
sys.path.insert(0, sys.argv[1]); sys.stdout.reconfigure(encoding="utf-8")
import server
from urllib.request import Request, urlopen
sysmsg = server.load_system_prompt()
msgs = [{"role": "system", "content": sysmsg},
        {"role": "user", "content": "Min printer virker ikke"},
        {"role": "assistant", "content": "Hej! Jeg hjælper dig gerne. Er printeren tilsluttet med et USB-kabel, eller via trådløst netværk?"},
        {"role": "user", "content": "Det er en HP printer med USB-kabel. Der står at den er offline."}]
for model in sys.argv[2:]:
    r = json.loads(urlopen(Request("http://127.0.0.1:11434/api/chat", data=json.dumps(
        {"model": model, "stream": False, "think": False, "messages": msgs}).encode(),
        headers={"Content-Type": "application/json"}, method="POST"), timeout=900).read())
    print(f"\n##### {model} | TOTAL {r['total_duration']/1e9:.0f}s (load {r.get('load_duration',0)/1e9:.0f}s)\n{r['message'].get('content','')}")
