# Modeltest: valg af AI-model til Simon

Dato: 9. november 2026

## Formål

Den første model, `bonsai-2:latest`, var for langsom til at kunne bruges: op til 250 sekunder pr. svar. Testen sammenligner gratis modeller fra Ollama på hastighed og kvalitet af det danske, når de får Simons rigtige systemprompt ([backend/system_prompt.md](../backend/system_prompt.md)).

## Testopsætning

| | |
|---|---|
| Computer | Bærbar med Intel Core i5-1335U (10 kerner), 32 GB RAM |
| Grafik | Intel Iris Xe (integreret, ikke brugt af Ollama; alt kører på CPU) |
| Styresystem | Windows 11 |
| Ollama | Version 0.40.15 |
| Indstillinger | `think: false`, ellers Ollamas standardindstillinger |
| Systemprompt | Ca. 945 tokens |

Testen bestod af to runder:

1. **Første spørgsmål** ([bench.py](bench.py)): to spørgsmål sendt hver for sig.
   - "Min printer virker ikke"
   - "Hvordan opdaterer jeg driveren til mit grafikkort?"
2. **Opfølgning** ([bench_samtale.py](bench_samtale.py)): en samtale, hvor brugeren svarer: "Det er en HP printer med USB-kabel. Der står at den er offline." Formålet var at se, om modellen giver rigtige trin og ikke kun stiller spørgsmål.

Testen er lille, med tre spørgsmål pr. model. Den viser tydelige forskelle i hastighed og sprog, men erstatter ikke acceptkriterium A04, som kræver ét eksempel inden for hver af de fem supportkategorier.

## Resultat

| Model | Fylder | 1. svar (inkl. opstart) | Svar herefter | Dansk og vejledning |
|---|---|---|---|---|
| `bonsai-2:latest` (9B) | 3,2 GB | 250 s | 112 s | Kluntet dansk ("computern", "fiziske button") |
| `bonsai-2:4b` | 1,6 GB | 109 s | 79 s | Dårligt dansk og forkerte trin. Kan ikke bruges |
| `qwen3.5:2b-q4_K_M` | 1,9 GB | 25 s | 19 s | Finder på menuer, der ikke findes, og bruger Markdown |
| `qwen3.5:4b-q4_K_M` | 3,3 GB | 48 s | 24–56 s | Forståeligt, men med underlige formuleringer |
| **`gemma4:e2b-it-qat`** | 4,3 GB | **17 s** | **4–7 s** | Fint, enkelt dansk med enkelte småfejl |
| `gemma4:e4b-it-qat` | 6,1 GB | 47 s | 7–8 s | Bedste dansk. Ingen fejl i testen |

Første svar inkluderer den tid, det tager at indlæse modellen i hukommelsen. Det sker kun, når modellen ikke allerede er indlæst.

### Hvorfor er Gemma 4 så meget hurtigere?

- **Den behandler prompten hurtigere.** `bonsai-2` læste prompten med ca. 7–12 tokens i sekundet, og Gemma med 44–251 tokens i sekundet. `bonsai-2` bruger ternære vægte (−1, 0, +1), som tilsyneladende ikke er optimeret til denne CPU.
- **Den genbruger systemprompten.** Gemma gemmer den behandlede systemprompt mellem kaldene, så de næste svar kun skal behandle den nye tekst (op til 3710 tokens i sekundet i testen). Det kunne `bonsai-2` og `qwen3.5` ikke, så de skulle læse hele systemprompten igen ved hvert svar.

## Valg

**Vi bruger `gemma4:e2b-it-qat`.** Det er den hurtigste model med brugbart dansk, og den følger systemprompten: korte svar, ét spørgsmål ad gangen, ingen Markdown, og den starter med det simple.

`gemma4:e4b-it-qat` skriver lidt bedre dansk, men er langsommere og kræver mere hukommelse. Den kan være et alternativ på kraftigere computere.

**Kendte begrænsninger:**
- Alle de små modeller kan finde på menu- og knapnavne, der ikke findes. Vejledningerne bør derfor kontrolleres i acceptkriterium A04.
- `gemma4:e2b-it-qat` fylder 4,3 GB og bruger flere GB RAM, mens den kører. På svage computere kan det udløse fejlscenarie FE03 (for lidt hukommelse).

## Svarene fra testen

### Første spørgsmål: "Min printer virker ikke"

**bonsai-2:latest** (250 s)
> Hej! Jeg takker dig for at skrive til os. Det er desværre et svært problem, og det skal vi forsøge at løse sammen.
>
> Før vi starter med noget konkret, har jeg to spørgsmål for at forstå situationalen bedre:
>
> 1. Er printeren bundet til computern via USB-kabel, eller er den koblet til internetet (wireless/WiFi)?
> 2. Har du prøvet at trykke på den fiziske button på printeren for at tændre den op, og har du en computer i brug lige nu?
>
> Jeg venter din svar, så vi kan gå videre.

**bonsai-2:4b** (109 s)
> Hej! Det lyder som en svært stressende problem at have i helles, men vi løber denne sammen step for step.
>
> Da du har en printer, må jeg først finde ud af, hvilken typ printer du bruger, og om den er nyet eller hvis den har været ved siden ved i lidt.
>
> Hvilken type printer har du? (F.eks. Canon, HP, Epson eller en helton printer?)

**qwen3.5:2b-q4_K_M** (25 s)
> Dette er en meget almindelig fejl, hvor printeren kan ikke tale med computeren. Lad os gå gennem dette trin ad gangen.
>
> 1. \*\*Klik på "Din computer" eller "Systemhjemme"-symbolet i det nederste hjørne af skærmen.\*\*
> (Sådan ser det typisk ud som et billede af en computerskærm med logoerne til højre).
>
> 2. \*\*Klik derefter på "Udskriftsindstillinger"\*\* i listen, som står lige under systemhjemmet.
>
> Hvad skal jeg gøre videre?

**qwen3.5:4b-q4_K_M** (48 s)
> Hej! Jeg ved godt, hvor irriterende det kan være, når en printervirker for sig selv. Det betyder dog ikke altid, at printeren er pår. Vi kigger sammen på det lidt, så finder ud af, hvad der skal til.
>
> Prøv først disse to trin:
> 1. Tjekker, om papirkassen er tom og om strømmen står til på trykteren. Så sætter du den i gang ved at trykke på power-knappen.
> 2. Går derefter ind i menuen under Start (den cirkel med fire ikoner nederst til venstre), skriver "printere" i søgefeltet, og vælger din printer der, når den viser sig i listen.
>
> Er papirkassen fullt og sender strømmen? Og står din printers navn ikke længere i listen under printere?

**gemma4:e2b-it-qat** (17 s)
> Hej! Jeg hedder Simon. Jeg hjælper dig med din computer.
>
> For at jeg kan hjælpe dig med din printer, har jeg brug for lidt mere information.
>
> Hvilken printer bruger du i dit computer?

**gemma4:e4b-it-qat** (47 s)
> Hej! Jeg er Simon fra TrygIT. Jeg hjælper dig gerne med din printer.
>
> For at jeg bedre kan hjælpe dig, kan du fortælle mig, om du har et modem eller et netværkskabel forbundet til printeren, eller om den er tilsluttet med et USB-kabel til din computer?

### Første spørgsmål: "Hvordan opdaterer jeg driveren til mit grafikkort?"

**bonsai-2:latest** (112 s)
> Hej! Jeg er Simon fra TrygIT. Det er en meget almindelig opgave at opdatere dine grafikdrivere, og det kan gøre, at computeren bliver hurtigere eller vise nyheder, du har brug for.
>
> Jeg skal først afklare en ting, før vi starter. Er din grafikkort installeret fra originalfabrikkens drivere (den såkaldte OEM-driver), eller har du selv installerede drivere, som eksempelvis NVIDIA eller AMD? Det påvirker meget lidt vores procedurer.

**bonsai-2:4b** (79 s)
> For at finde og opdatere din grafikort-driver på Windows 11 kan du følge med dette:
>
> 1. Klik på Start-knappen i bunden af skærmen, og skriv "Windows Update".
> 2. Æbber venster menu og klik på "Indskriv" for at sikre, at din computer er upådatet.
> 3. Venter på opdateringen, så der kan hente en grafikort-opdatering.
> 4. Når den er klar, start en ny indskriv af din computer.
> 5. I venster menu vil der nu være tilgænge til "Indskriv" igen. Klik på den.
>
> Hvis du ikke kan finde grafikkort-en på listen, så skal vi kigge ind i din pc:s detaljer (opdatering > systemlignende detaljer). Kan du fortælle mig, hvordan du finder dine detaljer nu?

**qwen3.5:2b-q4_K_M** (19 s)
> Hvis du har kørt med det samme grafikkort længe som muligt, er der ikke nødvendigvis en "driver", men i stedet skal du installere \*\*kontrolprogrammet\*\* fra producenten. Dette svarer meget nøjagtigt til, hvad en driver gør i computerlægeordning.
>
> Hvordan installerer jeg kontrolprogrammet?
> Lad mig se først på hvordan computeren ser ud nu:
> 1. Klik på starten med tænding (Windows-knappen) og tryk på \*\*Opdatering & sikkerhed\*\*.
> 2. Vælg \*\*Kontrolprogrammer\*\*, hvor du kan se alle dine installerede program.
>
> Hvorfor er det vigtigt at installere et controlprogammer?
> Det er som en lille hjelperapport til dit grafikkort, der hjælper computeren med at vide hvad det skal gøre for dig – eller hvis det falder i skærmen, hvordan vi kan læse op på screeningen.

**qwen3.5:4b-q4_K_M** (24 s)
> Det er et godt spørgsmål. En drivere er et lille program på computeren, der gør at grafikken (skærmbilledet) taler med maskinvaren. Når du opdaterer den, får du bedre kvalitet i billeder og film, måske flere funktioner eller en rettet fejl.
>
> Først skal jeg spørge: Er det en Windows 11-computer, den du bruger?

**gemma4:e2b-it-qat** (7 s)
> Hej! Jeg hedder Simon, og jeg vil meget gerne hjælpe dig med det. Vi kan godt tjekke, hvordan du opdaterer driveren til dit grafikkort på Windows 11.
>
> Det kan nogle gange være lidt teknisk, men vi gør det trin for trin.
>
> Før vi starter, må jeg spørge: Hvilken producent er dit grafikkort? Er det fra f.eks. NVIDIA, AMD eller Intel?

**gemma4:e4b-it-qat** (8 s)
> Hej! Jeg kan hjælpe dig med det. For at jeg kan vejlede dig bedst muligt, skal jeg vide, om du har fundet ud af, hvilken type grafikkort du har, eller om du kender mærket på dit grafikkort (som f.eks. Nvidia, AMD eller Intel)?

### Opfølgning: "Det er en HP printer med USB-kabel. Der står at den er offline."

Kun de tre bedste modeller fra første runde blev testet.

**gemma4:e2b-it-qat** (4 s)
> Det lyder som et almindeligt problem. Lad os prøve at tjekke et par ting.
>
> 1. Tjek om printeren er tændt. Er der lys på printeren?
>
> Fortæller lysene, om printeren er tændt og klar til at arbejde?

**gemma4:e4b-it-qat** (7 s)
> For at jeg kan hjælpe bedst muligt, skal vi lige tjekke et par ting. Er printeren tændt, og virker lampen på printeren, når du trykker på en knap?

**qwen3.5:4b-q4_K_M** (56 s, heraf 11 s opstart)
> Udset det ser ud, som om der er lidt forstyrrelse mellem computeren og printeren. Lad os se nærmere på koblingen.
>
> Vi skal starte med at tjekke, om kablet sidder rigtig godt fast i begge steder. Tjek venligst, at USB-kablet sidder stramt inde i selve printeren og lige ved siden af det sorte vindue på din computer.
>
> Vil du prøve at trække kabelen ud igen og sætte den helt fast?

## Gentag testen

Kør fra projektmappen, mens Ollama kører, og modellen er hentet:

```
python res/bench.py backend gemma4:e2b-it-qat
python res/bench_samtale.py backend gemma4:e2b-it-qat gemma4:e4b-it-qat
```
