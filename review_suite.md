# Review EvalSuite (`evalSuite/`)

Acest document rezumă ce testează în mod real suita de evaluare și unde există diferențe față de fluxul dorit:

> **Flux dorit:** input_nl → traducere reală NL→DSL → validare DSL → rulare în `Session` (KB + reasoning) → obținere vectori/puncte → decodare/explicare în NL cu codul real → comparație cu rezultatul așteptat.

## 1) NL → DSL este, în practică, ocolit

### Observație
- În `evalSuite/lib/runner.mjs:59-67`, dacă `testCase.input_dsl` există, faza NL→DSL este **skipped** și se folosește direct `input_dsl`.
- Majoritatea cazurilor din `evalSuite/**/cases.mjs` conțin `input_dsl`, deci **NU se testează efectiv** `NLTransformer.transform()`.

### Impact
- Suita măsoară în principal corectitudinea pipeline-ului de reasoning pe DSL scris manual, nu calitatea traducerii NL→DSL.

### Recomandare fix
- Introdu un câmp separat pentru așteptări, de ex. `expected_dsl`.
- Rulează NL→DSL când există `input_nl` și compară strict/robust cu `expected_dsl`.
- Păstrează `input_dsl` doar pentru cazuri “DSL-only” (fără NL), nu ca shortcut implicit.

## 2) DSL generat din NL nu este validat explicit

### Observație
- `runNlToDsl()` (`evalSuite/lib/runner.mjs:73-96`) consideră faza trecută dacă există output DSL nenul și nu există erori fatale.
- Nu există un câmp de tip `expected_dsl` / `expected_input_dsl` în suite (căutarea nu găsește astfel de așteptări).

### Impact
- Un DSL greșit, dar nenul, poate trece faza NL→DSL; eventual eșecul apare abia în reasoning, fără semnal clar că traducerea NL→DSL e cauza.

### Recomandare fix
- Adaugă `expected_dsl` per step și verifică:
  - normalizare whitespace;
  - ignorare ordinii liniilor (opțional) pentru seturi de fapte;
  - comparare structurală (ideal: parse AST și compară AST).

## 3) “Core theory stack” nu este folosit de runner

### Observație
- Loaderul (`evalSuite/lib/loader.mjs:20-50`) citește `config/Core/index.sys2` și fișierele de teorie, dar **runner-ul nu le încarcă în sesiune**.
- `runSuite()` creează un `new Session(...)` (`evalSuite/lib/runner.mjs:86-87`) și rulează pașii, fără `session.learn(coreTheory...)`.
- `Session` nu încarcă automat core theories în constructor (`src/runtime/session.mjs:40-56`).

### Impact
- Afirmația din `evalSuite/run.js:49` (“Testing NL→DSL transformation with Core Theory stack”) este în prezent înșelătoare.
- Lista `export const theories = [...]` din fiecare `cases.mjs` este în mare parte **decorativă** (nu e aplicată automat), cu excepția cazurilor care fac explicit `@_ Load ...` în DSL.

### Recomandare fix
Alege una dintre opțiuni:
1. **Load explicit la începutul fiecărei suite**: primul step să facă `@_ Load "./config/Core/index.sys2"`.
2. **Auto-load în runner**: în `runSuite()` după crearea sesiunii, rulează `session.learn()` pe conținutul din `suite.coreTheory` (deja încărcat de loader).
3. **Auto-load în Session** (mai intruziv): constructorul `Session` să încarce stack-ul Core implicit (probabil nu vrei asta dacă Session e folosit și în alte contexte).

## 4) DSL → NL nu folosește decodarea reală a sistemului

### Observație
- `runDslToNl()` (`evalSuite/lib/runner.mjs:568-640`) generează text pentru `query/prove/learn` folosind funcții custom (`generatePhrase()`, `textFromBindings()`, `textFromProof()`).
- `session.summarize()` / `session.elaborate()` apar în runner (`evalSuite/lib/runner.mjs:176-195`), dar suite-urile nu au `action: 'summarize'` / `action: 'elaborate'`, deci nu sunt testate.

### Impact
- Nu se verifică “traducerea punctelor/vectory în limbaj natural” cu codul real al proiectului.
- Testele pot trece chiar dacă decodarea reală (`Session.decode/summarize`) e degradată, deoarece nu e folosită.

### Recomandare fix
- Pentru query:
  - folosește vectorul factului rezultat (sau un vector “answer”) și rulează `session.summarize(vec)`; sau
  - adaugă o cale standard în `Session` care să întoarcă și vectorul cel mai potrivit pentru fiecare rezultat.
- Pentru prove:
  - fie folosești `session.elaborate(proof)` ca output NL standardizat;
  - fie păstrezi textFromProof, dar marchezi explicit că nu e “decoderul real”.

## 5) Compararea cu `expected_nl` e prea permisivă (risc de false-positive)

### Observație
- În `evalSuite/lib/runner.mjs:621-624`, testul trece dacă:
  - `actual` conține `expected` **sau**
  - `expected` conține `actual` **sau**
  - sunt egale.

### Impact
- Pentru rezultate multiple, dacă sistemul întoarce doar o parte din rezultate, poate trece deoarece `expected` conține `actual`.

### Recomandare fix
- Schimbă regula implicită la “**actual trebuie să conțină expected**” (nu și invers).
- Pentru query-uri cu multiple rezultate:
  - definește un format așteptat (listă de propoziții) și compară seturi (order-insensitive);
  - opțional verifică numărul minim de rezultate.

## 6) Încărcarea teoriilor cu `@_ Load` poate ascunde erori

### Observație
- `Executor.executeLoad()` returnează `errors`, dar nu forțează eșecul încărcării dacă există erori la execuție (`src/runtime/executor.mjs:160-188`).

### Impact
- Un “Load” poate părea reușit, iar suite-ul continuă pe o bază de cunoștințe parțială.

### Recomandare fix
- În `executeLoad()`, dacă `result.errors.length > 0`, fie:
  - arunci `ExecutionError`, fie
  - întorci `loaded: false` și `success: false`, iar `Session.learn()` să reflecte asta.

## Ce testează bine suita acum
- Rulează pașii în aceeași sesiune pe durata suite-ului (`evalSuite/lib/runner.mjs:84-92`), deci KB persistă între pași.
- Folosește implementările reale `Session.learn/query/prove` pentru DSL (deci reasoning-ul pe DSL e verificat).

## Propunere minimă de refactor (prioritizare)
1. **Separă `input_dsl` de `expected_dsl`** și rulează obligatoriu NL→DSL când există NL.
2. **Încarcă Core stack** automat (runner sau primul pas în suite).
3. **Întărește matching-ul pe `expected_nl`** (fără `expected.includes(actual)` implicit).
4. **Mută NL output pe decodare reală** (introdu un API în Session pentru a returna vectorul relevant din query/prove, apoi `summarize/elaborate`).

---

Dacă vrei, pot implementa direct aceste schimbări în `evalSuite/lib/runner.mjs` (și eventual o extensie mică în `src/runtime/session.mjs` pentru a expune vectorii necesari decodării).