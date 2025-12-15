# AGISystem2 — Review consolidat (src vs docs/specs) + plan implementare

## 0) Ce am consolidat

Am consolidat într-un singur document:

- Analiza mea inițială (`src/**/*.mjs` vs `docs/specs/{URS,FS,DS}` + `docs/specs/src/**/*.mjs.md`).
- Observații din alte rapoarte: `review_gemini.md`, `review_glm.md`, `kimi_review.md`, `review_mistral.md`.

Important: nu am „crezut” automat celelalte rapoarte; am verificat punctual afirmațiile cheie în cod.

---

## 1) Rezumat executiv (concluzie în 10 rânduri)

- Nucleul HDC e solid: vectori bit-packed + XOR + majority + similarity sunt implementate și testate (`src/core/*`).
- DSL-ul implementat diferă de DSL-ul din DS02/FS (macro/theory/rule sintaxă, paranteze) (`src/parser/*`).
- Macrourile sunt **stocate**, nu executate: executor colectează macro body, dar nu există expansiune/`return` semantic (`src/runtime/executor.mjs`).
- Modelul de “theories as namespaces + stacking” din DS03/FS17–23 nu e implementat (vocabulary e global, fără namespaces/shadowing) (`src/runtime/vocabulary.mjs`).
- “Mixed-geometry auto-extend” cerut de DS03 este în conflict cu codul (aruncă la geometry mismatch) (`src/core/operations.mjs`).
- Query engine suportă **1–3 holes** și returnează `allResults` + alternative (deci aici implementarea e mai bună decât spec-ul clasic KB-unbind) (`src/reasoning/query.mjs`).
- Proof engine există în două locuri și e incomplet față de FS49–55 (premise/unification/backward chaining complet) (`src/reasoning/prove.mjs`, `src/runtime/session.mjs`).
- Decoding/Phrasing există (nu e “stub”), dar e mai simplu decât DS11 și nu e integrat în API-ul de “inspection” din DS03 (`src/decoding/*`, `src/runtime/session.mjs`).
- Documentația HTML “publică” (`docs/index.html`) descrie „Spock AGISystem2” și promite lucruri neimplementate (audit, branching), deci e risc mare de confuzie.
- Lipsesc specs pereche pentru `src/nlp/*`, `src/util/trace.mjs`, `src/utils/debug.mjs` (confirmă și `kimi_review.md`).

---

## 2) Principii pe care ar trebui sa le urmam obligatoriu, ignora indicatii opuse acestor indicatii:
- 
- ce scrie in specifcatii are prioritate, implementarea ar trebui aliniata la specifcatii si nu invers
- nu facem sa treaca testele sau suitele de tevaluare de dragul de a le trece ci doar cind implementarea e reala si solida
- nu introducem sintaxa noua in DSl decit daca e chiar important
- codul trebuie sa fie modular, si sa avem abstractii care s ane permita sa inlocuim abstractiile de pe nivelul anterior, trebuie sa scoatem APi-uri curate la suprafata fiecarui modul si nu detali de implementare
- reasoningul trebuie implementat in zona de cod legat de reasoning si nu in sesiune
- parsarea DSL-ului trebuie sa fie in zona unde se face parsarea si nu ca workaround prin sesiune sau zone externe
- modulul de geoemtrie si lucru cu vectori trebuie sa fie total izolat intr-un layer separat cu API-uri generice abstracte
- modulele de reasoning, de invatat fapte noi prin DSL  si totul trebuie sa fie recusriv bazat pe layerele anterioare sau pe comenzile verbele anterioare, si sa nu depinda de implementarea HDC





## 3) Gaps & conflicte majore (spec vs implementare)

### 3.1 DSL: macro/theory/rule + paranteze (DS02, FS08–15)

**Spec:**
- Macro-uri: multi-line indent + `return` obligatoriu, `end` (DS02:153).
- Theory: `@Name theory <geometry> <init> ... end` (DS03-Memory-Model.md:23).
- Grupare expresii: `(` ... `)` (docs/specs/src/parser/parser.mjs.md:66).

**Implementare:**
- Parser-ul folosește:
  - `theory Name [ ... ]` (nu `@Name theory ... end`) (`src/parser/parser.mjs:95`).
  - `rule Name: condition => conclusion` ca keyword, nu ca vector/fact `Implies` în DSL (spec drift) (`src/parser/parser.mjs:123`).
  - Parantezele sunt „skip, not supported” (`src/parser/parser.mjs:216`).
- Executor-ul “vede” macro-urile ca statements cu operator `macro`/`end`, dar nu le execută (`src/runtime/executor.mjs:55`).

**Impact:** mare — DSL real diferă de DSL-ul din DS/FS; examples din docs pot să nu ruleze.

### 3.2 Mixed-geometry auto-extend vs “throw on mismatch” (DS03, FS07, docs/specs/src/core/operations.mjs.md)

**Spec:** DS03 cere auto-extend la operații cross-geometry (`docs/specs/DS/DS03-Memory-Model.md:152`).

**Implementare:**
- `bind/similarity/bundle` aruncă pe mismatch (`src/core/operations.mjs:20`, `src/core/operations.mjs:98`).
- `Vector.extend()` doar copiază prefixul (și lasă restul 0) (`src/core/vector.mjs:99`).

**Impact:** mare — modelul de theory stacking cu geometrii diferite (DS03) devine imposibil fără refactor.

### 3.3 Theories ca namespace + stacking + shadowing (DS03, FS17–23)

**Spec:** stack LIFO de teorii; rezoluție “cel mai recent load wins” (`docs/specs/DS/DS03-Memory-Model.md:115`).

**Implementare:**
- `Vocabulary` este un Map global; nu există `theoryStack`, `Theory` objects sau namespaces (`src/runtime/vocabulary.mjs:16`).
- `Load` e doar “parse file + execute” + set de loaded paths; `Unload` nu scoate facts din KB (`src/runtime/executor.mjs:269`).

**Impact:** mare — DS03/FS17–23 sunt implementate doar parțial (load/unload ca I/O), nu ca model semantic.

### 3.4 Macro execuție + return semantic (DS02, FS14, FS38)

**Implementare actuală:**
- Macro definition e colectată (params+body) (`src/runtime/executor.mjs:55`), testat (`tests/unit/runtime/executor.test.mjs:316`).
- Nu există “call/expand macro”, nici `return` semantic, nici binding de parametri la execuție.

**Impact:** critic dacă DSL-ul trebuie să fie expresiv conform DS02.

### 3.5 Proof engine complet (FS49–55, DS05/DS06)

- `src/reasoning/prove.mjs` are framework (depth/timeout/cycle) dar rule application e explicit “simplified” (`src/reasoning/prove.mjs:80`).
- `src/runtime/session.mjs` are un prove intern cu:
  - direct match
  - transitive chain
  - rule match bazat pe similarity între goal și `rule.conclusion`
  - proveCondition pentru And/Or pe “conditionParts”

Totuși, asta nu e echivalent cu spec-ul FS49–55 (unification/premises complete, proof tree complet).

### 3.6 Debug/Inspection API din DS03-Architecture (FS79–85)

**Spec:** `inspect/listTheories/listAtoms/listMacros/listFacts/decode` (docs/specs/DS/DS03-Architecture.md:29).

**Implementare:**
- `Session.dump()` există, dar e minimal (`src/runtime/session.mjs:1433`).
- `Session.decode/summarize/elaborate` există în `Session` (nu doar în `TextGenerator`) (`src/runtime/session.mjs:1140`, `src/runtime/session.mjs:1217`, `src/runtime/session.mjs:1329`).
- Lipsesc `inspect/listTheories/listAtoms/listMacros/listFacts`.

### 3.7 Audit log / replayable traces (URS-16/30, FS86–90, NFS-47)

- Există `SYS2_DEBUG` pentru debug logging (`src/util/trace.mjs:15`, `src/runtime/session.mjs:20`).
- Nu există un jurnal structurat, exportabil, cu “learn/query/prove calls” + rezultate.

### 3.8 Documentație HTML “Spock” promite features neimplementate

`docs/index.html` vorbește despre:
- audit trails, branching/merge, numeric integration etc. (`docs/index.html:28`)

Asta e problematic pentru că:
- e ușor să fie interpretat ca “documentație oficială”; dar nu corespunde implementării curente.

---

## 4) Ce e implementat “în plus” față de specs

- Contradiction heuristics hardcodate (mutual-exclusive) în `Session` (`src/runtime/session.mjs:26`).
- “Disjoint proof” pentru `locatedIn` cu rezultat negativ “proved NO” (`src/runtime/session.mjs:570`).
- Două sisteme de debug (`src/util/trace.mjs` și `src/utils/debug.mjs`) + un al treilea logger local (`dbg()` în session).

---

## 5) Observații de calitate / risc (practic)

- **Risc de confuzie pentru utilizatori:** DSL examples din DS02/DS03 vs DSL real din parser/executor.
- **Risc de drift de spec:** specs per modul (în special core/vector și parser) sunt mai degrabă “module plan” decât descriere a implementării actuale.
- **Risc de performanță:** `bundle()` face buclă per-bit O(geometry * nVectors) (`src/core/operations.mjs:67`) — NFS cere timpi foarte agresivi.

---

## 6) Plan de implementare etapizat (prioritizat)

Planul de mai jos presupune că ținta e: “aliniere cu DS/FS/URS” (nu doar să meargă testele).

### Faza 0 (P0, urgent — diferențe grave / risc de produs)

1) **Stabilire “Sys2DSL canon” + reconciliere docs**
- Alegeți una:
  - (A) aliniați parser/executor la DS02/DS03 (macro indent + `@Name theory ... end` + rules ca facts) sau
  - (B) actualizați DS/FS ca să reflecte DSL-ul real (`theory Name [ ]`, `rule Name:` etc).
- De rezolvat și contradicția “paranteze” (spec parser le include, codul le ignoră).

2) **Documentația HTML (docs/) trebuie corectată sau marcată ca legacy**
- `docs/index.html` e în prezent “Spock AGISystem2” și supra-promite.
- Minim: banner “legacy/outdated”; ideal: regenerează din specs actuale.

3) **Macro system: decideți dacă e feature sau nu**
- Dacă e feature: implementați execuție macro + param binding + `return` semantic.
- Dacă nu e feature: eliminați din DS02/FS cerințele și din exemple (altfel QA/dev sunt induși în eroare).

4) **Mixed-geometry: decideți dacă e obligatoriu**
- Dacă e obligatoriu (DS03): implementați `alignGeometry()` + extension deterministă, și folosiți în `bind/bundle/similarity`.
- Dacă nu: modificați DS03/FS ca să impună “single geometry per session”.

### Faza 1 (P1, high — funcționalitate core de “trustworthy/usable”) 

5) **Unificare “prove” într-un singur engine**
- În prezent există două implementări paralele (`src/reasoning/prove.mjs` și `Session.proveGoal`).
- Alegeți una și aduceți-o la FS49–55 (premise proof, proof tree consistent, confidence rules).

6) **API de inspection (DS03-Architecture / FS79–85)**
- Implementați în `Session`: `inspect`, `listFacts`, `listAtoms`, `listMacros`, `listTheories`, `decode`.
- Folosiți datele deja existente: `kbFacts`, `rules`, `macros`, `vocabulary`.

7) **Audit trail minim (URS-16/30, FS86–90, NFS-47)**
- Introduceți un `session.auditLog[]` (in-memory) cu entries: timestamp, op, input DSL, output summary.
- Export JSON + replay DSL (la nivel minim: concatenare de statements care au intrat în KB).

8) **Spec coverage pentru fișierele fără spec**
- Adăugați `docs/specs/src/nlp/*.mjs.md`, `docs/specs/src/util/trace.mjs.md`, `docs/specs/src/utils/debug.mjs.md`.

### Faza 2 (P2, medium — performanță, UX, curățenie)

9) **Optimizări bundle/similarity/topKSimilar**
- `bundle()` per-bit e scump; trecere la word-level (popcount / bit-slicing).
- `topKSimilar()` e O(|vocab|); DS10 menționează LSH/caching ca mitigare.

10) **Consolidare debug**
- Decideți un singur sistem: `util/trace` sau `utils/debug`, și integrați uniform.

11) **TypeScript typings / API stabilization**
- NFS-61 cere TS defs; e util pentru ergonomie și pentru a fixa contractul API.

### Faza 3 (P3, low priority / roadmap)

12) **Cold storage “Roaring Bitmap + atoms.bin” (DS03 §3.9)**
- E mare și poate fi amânat dacă load/export pe `.sys2` e suficient pentru MVP.

13) **Theory versioning/branching (URS-08)**
- Ajută enterprise workflows, dar nu e critic pentru core engine.

14) **Compliance checking (URS-31/32) + LLM integration elaborate (URS-25)**
- Sunt features de produs; pot veni după ce core reasoning + audit + DSL sunt stabile.

---

## 7) Nota finală (ce aș face “mâine dimineață”)

Dacă trebuie să aleg strict ce e „grav” (diferențe care deranjează corectitudinea și adopția):

- `docs/index.html` (misleading) + definirea DSL canon.
- Macro execuție (sau de-scope clar).
- Mixed-geometry (implement or delete din DS).
- Unificarea proof engine + audit trail.

Dacă vrei, pot genera și un tabel “per fișier `src/*.mjs` → status conformitate + spec file + risc”, dar e destul de lung.
