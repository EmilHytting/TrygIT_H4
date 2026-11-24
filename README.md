# TrygIT Lokal Assistent

En lille lokal webchat til Ollama-modeller.

## Forudsætninger

- Python 3
- Ollama installeret og startet
- Simons model hentet i Ollama, [gemma4:e2b-it-qat](https://ollama.com/library/gemma4) (4,3 GB):

  ```
  ollama pull gemma4:e2b-it-qat
  ```

  Modellen er valgt ud fra testen i [res/modeltest.md](res/modeltest.md) og vælges automatisk i appen. Andre installerede modeller kan stadig vælges i listen.

## Anbefalede Ollama-indstillinger (hastighed)

Flash attention og en komprimeret KV-cache (modellens hukommelse af prompten) gør lange prompter hurtigere og bruger mindre hukommelse. Indstillingerne gælder Ollama-serveren, ikke appen, så de sættes én gang på computeren.

Windows (PowerShell), luk derefter Ollama i proceslinjen og start den igen:

```
setx OLLAMA_FLASH_ATTENTION 1
setx OLLAMA_KV_CACHE_TYPE q8_0
```

Linux (systemd): kør `sudo systemctl edit ollama.service`, tilføj nedenstående og kør `sudo systemctl restart ollama`:

```
[Service]
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_KV_CACHE_TYPE=q8_0"
```

## Start appen

Kør fra projektmappen:

```
python backend/server.py
```

På macOS og Linux hedder kommandoen `python3`

Åbn derefter [http://127.0.0.1:3210](http://127.0.0.1:3210) i din browser. 

## Udvikling
- `backend/server.py` serverer brugerfladen og videresender lokale API-kald til Ollama med Python-standardbiblioteket.
- Gemte chats ligger lokalt i `backend/chats.sqlite3` og kan åbnes igen i samtalevælgeren øverst i appen.
- `backend/system_prompt.md` er Simons systemprompt. Backend'en sender den med hvert kald, så den kan rettes uden genstart. `{os}` erstattes automatisk med brugerens styresystem.
- Standardmodellen sættes i `DEFAULT_MODEL` i `backend/server.py`.
- Forsiden viser fem hjælpeområder. `SKILLS` i `backend/server.py` styrer deres instruktioner og modelvalg. `model: None` bruger `DEFAULT_MODEL`; sæt et installeret Ollama-modelnavn for at bruge en anden model til et område. Modellen indlæses af Ollama ved første besked.
- `backend/skills/<id>.md` er kontekst til hvert hjælpeområde (afklaring, fejlfindingsrækkefølge, menuplaceringer, hvornår der henvises til support). Filen læses ved hvert kald og lægges efter systemprompten. Tekst mellem `[WINDOWS]`…`[/WINDOWS]` og `[LINUX]`…`[/LINUX]` sendes kun med, når brugerens styresystem passer; er det ukendt, sendes begge. Mangler filen, bruges `instruction` fra `SKILLS`.
- Computerens specs (model, processor, RAM, ledig diskplads, grafikkort med driverversion), enheder med fejl i Enhedshåndtering og registrerede printere (med driver) hentes automatisk: på Windows med `backend/system_info.ps1`, på Linux fra `/proc` og `lpstat`. De hentes i baggrunden ved opstart og når appens vindue får fokus, og låses fast i samtalen ved første besked (kolonnen `system_info` i databasen). Specs indsættes i systemprompten via `{computer}`; printerlisten sendes kun med for hjælpeområderne i `PRINTER_INFO_SKILLS`, og enheder med fejl kun for `DEVICE_INFO_SKILLS`. Intet sendes ud af computeren.
- Hastighed: Alle kald til Ollama sender `keep_alive` (`KEEP_ALIVE`, standard 30 minutter) og `num_ctx` (`NUM_CTX`, standard 8192 tokens), og den model, der er valgt i modelvælgeren, indlæses via `/api/warmup`, når appen åbner, og når der vælges en anden model. Systemprompt, hjælpeområde og specs er ens gennem hele samtalen, så Ollama kan genbruge den allerede beregnede prompt.
- `src/` indeholder HTML, CSS og JavaScript til browseren.
- `res/` indeholder modeltesten ([res/modeltest.md](res/modeltest.md)) og scripts til at gentage den.

## Kodestruktur og navigation
Topbaren viser Simon og den aktuelle status. Burgermenuen viser tidligere samtaler, som åbnes ved et klik. Både “Ny samtale” og “Til forsiden” bruger `startNewConversation()` i `src/renderer.js`.

I samme fil bygger `createSkillCard()` hjælpeområderne, og `renderConversationList()` bygger samtalelisten. `updateControls()` opdaterer knapper og felter, mens `readAssistantStream()` læser svar fra serveren løbende. Backend samler systemprompt, hjælpeområde og modelnavn i `build_chat_prompt()` i `backend/server.py`.

## Modelvalg
Modelvælgeren over samtalen viser de installerede Ollama-modeller og er tilgængelig både på forsiden og i en samtale. Standardmodellen vælges først, hvis den er installeret; ellers vælges den første tilgængelige model. Dit valg bruges til den næste besked, også når du vælger et hjælpeområde. Vælgeren er låst, mens et svar er i gang. API-kald uden et modelvalg bruger fortsat hjælpeområdets model eller `DEFAULT_MODEL`.

## Automatisk opdatering af modeller
Modelvælgeren er samlet med samtaleknapperne i topbaren. Listen hentes ved opstart og igen, når appens vindue får fokus. Dit valg bevares, hvis modellen stadig er installeret. Listen genindlæses ikke under igangværende svar eller andre samtalekald. Dette opdaterer kun listen; selve modellerne installeres og opdateres i Ollama.

## Fælles skrivefelt på forsiden og i samtaler
Samtalefladen fylder den ledige plads på siden uden en ydre ramme. Skrivefeltet er altid synligt nederst, også før en samtale er startet. Du kan vælge et hjælpeområde eller skrive direkte; en direkte besked bruger generel IT hjælp. “Ny samtale” rydder historikken på skærmen og beholder modelvalget.

## Lyst og mørkt tema
Appen starter med mørkt tema. Knappen “Lyst tema” i topbaren skifter til lightmode og bliver derefter til “Mørkt tema”. Valget gemmes lokalt i browseren og bruges ved næste besøg.
