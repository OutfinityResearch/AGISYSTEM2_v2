# Plan: Abstractizare HDC - Strategii Multiple pentru Vectori Semantici

## Obiectiv

Refactorizarea AGISystem2 pentru a **izola complet** implementarea vectorilor HDC (actualmente `Uint32Array`) și a permite **strategii alternative** (polinoame sparse, BigInt, etc.), păstrând layerele superioare (reasoning, DSL, decoding) **complet agnostice** față de reprezentarea internă.

---

## Principii de Design

### P1: Separation of Concerns
```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Application (DSL, Session API)                    │
│  ────────────────────────────────────────────────────────── │
│  Layer 3: Reasoning (Query, Prove, Rules)                   │
│  ────────────────────────────────────────────────────────── │
│  Layer 2: HDC Operations Interface (bind, bundle, sim)      │  ← CONTRACT
│  ══════════════════════════════════════════════════════════ │
│  Layer 1: HDC Implementation Strategy                       │  ← SWAPPABLE
│           ├── DenseBinaryStrategy (Uint32Array)             │
│           ├── SparsePolynomialStrategy (Map<exp,coef>)      │
│           └── BigIntStrategy (BigInt[])                     │
└─────────────────────────────────────────────────────────────┘
```

### P2: Contract, nu Implementare
Layerele 2-4 depind DOAR de **contractul HDC** (interfața), NU de implementare:
- `bind(a, b) → c` unde `bind(bind(a,b), b) ≈ a`
- `bundle([a,b,c]) → d` unde `similarity(d, a) > 0.5`
- `similarity(a, b) → [0,1]`
- `similarity(random(), random()) ≈ 0.5`

### P3: Proprietăți Garantate vs Non-Funcționale

| Proprietate | Garantată de Contract | Variază per Strategie |
|-------------|----------------------|----------------------|
| `bind` e self-inverse | ✓ Da | - |
| `bind` e asociativ | ✓ Da | - |
| `similarity` în [0,1] | ✓ Da | - |
| Random vectors ≈ 0.5 similarity | ✓ Da | - |
| Bundle capacity | - | ✓ Variază |
| Memorie per vector | - | ✓ Variază |
| Viteza operațiilor | - | ✓ Variază |
| "Noise accumulation" rate | - | ✓ Variază |

---

## Structura Fișierelor Propusă

```
src/
├── hdc/                              # NOU: HDC Abstraction Layer
│   ├── contract/
│   │   ├── semantic-vector.mjs       # ISemanticVector interface
│   │   ├── vector-factory.mjs        # IVectorFactory interface
│   │   ├── hdc-operations.mjs        # IHDCOperations interface
│   │   └── hdc-properties.mjs        # HDCProperties (capacity hints)
│   │
│   ├── strategies/
│   │   ├── index.mjs                 # Strategy registry & selection
│   │   ├── dense-binary/             # STRATEGIA CURENTĂ (refactored)
│   │   │   ├── dense-vector.mjs      # Uint32Array implementation
│   │   │   ├── dense-operations.mjs  # XOR/majority/hamming
│   │   │   ├── dense-factory.mjs     # ASCII stamp init
│   │   │   └── dense-properties.mjs  # Capacity: ~200, etc.
│   │   │
│   │   ├── sparse-polynomial/        # STRATEGIE NOUĂ
│   │   │   ├── poly-vector.mjs
│   │   │   ├── poly-operations.mjs
│   │   │   ├── poly-factory.mjs
│   │   │   └── poly-properties.mjs
│   │   │
│   │   └── [alte strategii]/
│   │
│   └── facade.mjs                    # HDC Facade - single entry point
│
├── core/                             # MODIFICAT: devine THIN WRAPPER
│   ├── vector.mjs                    # Re-export din hdc/facade
│   ├── operations.mjs                # Re-export din hdc/facade
│   ├── position.mjs                  # Folosește ISemanticVector
│   └── constants.mjs                 # Păstrat (geometry, thresholds)
│
├── runtime/                          # NEMODIFICAT (folosește contract)
├── reasoning/                        # NEMODIFICAT (folosește contract)
├── parser/                           # NEMODIFICAT
└── decoding/                         # NEMODIFICAT
```

---

## Interfețe Contract (Layer 2)

### ISemanticVector
```javascript
// src/hdc/contract/semantic-vector.mjs

/**
 * Contract pentru un vector semantic HDC.
 *
 * INVARIANȚI GARANTAȚI:
 * - geometry e constant după creare
 * - bind(v, v) produce vector "zero" (all-cancel)
 * - clone() produce vector identic
 * - serialize/deserialize sunt inverse
 */
export interface ISemanticVector {
    /** Dimensiunea logică (număr de "slots" conceptuale) */
    readonly geometry: number;

    /** Identificator unic pentru debugging */
    readonly id?: string;

    // ══════════════════════════════════════════════
    // OPERAȚII FUNDAMENTALE (contractuale)
    // ══════════════════════════════════════════════

    /**
     * Bind: asociază acest vector cu altul.
     * Proprietăți garantate:
     * - Asociativ: (a.bind(b)).bind(c) ≡ a.bind(b.bind(c))
     * - Comutativ: a.bind(b) ≡ b.bind(a)
     * - Self-inverse: a.bind(a) produce "zero vector"
     * - Reversibil: a.bind(b).bind(b) ≈ a
     */
    bind(other: ISemanticVector): ISemanticVector;

    /**
     * Similarity: măsoară cât de aproape sunt doi vectori.
     * Proprietăți garantate:
     * - Range: [0, 1]
     * - Reflexiv: v.similarity(v) = 1.0
     * - Simetric: a.similarity(b) = b.similarity(a)
     * - Random baseline: random().similarity(random()) ≈ 0.5
     */
    similarity(other: ISemanticVector): number;

    // ══════════════════════════════════════════════
    // UTILITĂȚI
    // ══════════════════════════════════════════════

    /** Copie independentă */
    clone(): ISemanticVector;

    /** Extinde la geometry mai mare (pentru cross-theory ops) */
    extend(newGeometry: number): ISemanticVector;

    /** Verifică egalitate exactă */
    equals(other: ISemanticVector): boolean;

    // ══════════════════════════════════════════════
    // SERIALIZARE
    // ══════════════════════════════════════════════

    /** Export pentru stocare/transfer */
    serialize(): SerializedVector;
}

export interface SerializedVector {
    strategyId: string;      // "dense-binary", "sparse-poly", etc.
    geometry: number;
    data: unknown;           // Strategy-specific
    version: number;         // Pentru backward compat
}
```

### IVectorFactory
```javascript
// src/hdc/contract/vector-factory.mjs

/**
 * Factory pentru crearea vectorilor.
 * Fiecare strategie implementează propria factory.
 */
export interface IVectorFactory {
    /** Identificator strategie */
    readonly strategyId: string;

    /** Crează vector zero/gol */
    createZero(geometry: number): ISemanticVector;

    /** Crează vector random (~50% density conceptuală) */
    createRandom(geometry: number, seed?: number): ISemanticVector;

    /**
     * Crează vector deterministic din nume.
     * PROPRIETATE CRITICĂ: același (name, theoryId, geometry)
     * produce ACELAȘI vector, întotdeauna.
     */
    createFromName(
        name: string,
        theoryId: string,
        geometry: number
    ): ISemanticVector;

    /** Deserializare */
    deserialize(data: SerializedVector): ISemanticVector;

    /** Proprietăți non-funcționale ale strategiei */
    getProperties(): HDCStrategyProperties;
}
```

### IHDCOperations
```javascript
// src/hdc/contract/hdc-operations.mjs

/**
 * Operații HDC care lucrează pe colecții de vectori.
 * Separate de vector pentru a permite optimizări batch.
 */
export interface IHDCOperations {
    /**
     * Bundle: superpozitie de vectori multipli.
     * Proprietăți garantate:
     * - Rezultatul e similar cu TOȚI input-ii
     * - similarity(bundle([a,b,c]), a) > 0.5 (pentru n mic)
     * - Order-independent: bundle([a,b]) ≡ bundle([b,a])
     *
     * Proprietăți NON-garantate (variază per strategie):
     * - Capacitate maximă înainte de saturare
     * - Rata de degradare a similarității
     */
    bundle(
        vectors: ISemanticVector[],
        tieBreaker?: ISemanticVector
    ): ISemanticVector;

    /**
     * Bind multiplu (optimizat).
     * bindAll([a,b,c]) ≡ a.bind(b).bind(c)
     */
    bindAll(vectors: ISemanticVector[]): ISemanticVector;

    /**
     * Top-K cele mai similare din vocabular.
     */
    topKSimilar(
        query: ISemanticVector,
        vocabulary: Map<string, ISemanticVector>,
        k: number
    ): Array<{name: string, similarity: number}>;

    /**
     * Unbind: inversul lui bind.
     * Pentru strategii unde bind e self-inverse, unbind ≡ bind.
     */
    unbind(
        composite: ISemanticVector,
        component: ISemanticVector
    ): ISemanticVector;
}
```

### HDCStrategyProperties
```javascript
// src/hdc/contract/hdc-properties.mjs

/**
 * Proprietăți non-funcționale ale unei strategii HDC.
 * Folosite pentru hints și warnings, NU pentru logica de business.
 */
export interface HDCStrategyProperties {
    /** Identificator unic */
    strategyId: string;

    /** Nume human-readable */
    displayName: string;

    /** Capacitate recomandată pentru bundle */
    recommendedBundleCapacity: number;

    /** Capacitate maximă (după care accuracy < 55%) */
    maxBundleCapacity: number;

    /** Bytes per vector la geometry default */
    bytesPerVector: (geometry: number) => number;

    /** Complexitate bind */
    bindComplexity: 'O(1)' | 'O(n)' | 'O(n log n)' | 'O(n²)';

    /** Este sparse-friendly? */
    sparseOptimized: boolean;

    /** Suportă serializare compactă? */
    compactSerialization: boolean;

    /** Descriere pentru documentație */
    description: string;
}
```

---

## HDC Facade (Entry Point)

```javascript
// src/hdc/facade.mjs

/**
 * SINGLE ENTRY POINT pentru tot ce ține de HDC.
 *
 * Restul sistemului importă DOAR de aici.
 * Nu importează niciodată direct din strategies/.
 */

import { getActiveStrategy } from './strategies/index.mjs';

let activeStrategy = null;

export function initHDC(strategyId = 'dense-binary', options = {}) {
    activeStrategy = getActiveStrategy(strategyId, options);
    return activeStrategy;
}

export function getFactory(): IVectorFactory {
    if (!activeStrategy) initHDC();
    return activeStrategy.factory;
}

export function getOperations(): IHDCOperations {
    if (!activeStrategy) initHDC();
    return activeStrategy.operations;
}

export function getProperties(): HDCStrategyProperties {
    if (!activeStrategy) initHDC();
    return activeStrategy.properties;
}

// ══════════════════════════════════════════════
// CONVENIENCE EXPORTS (pentru backward compat)
// ══════════════════════════════════════════════

export function createVector(geometry) {
    return getFactory().createZero(geometry);
}

export function createFromName(name, theoryId, geometry) {
    return getFactory().createFromName(name, theoryId, geometry);
}

export function bind(a, b) {
    return a.bind(b);
}

export function bundle(vectors, tieBreaker) {
    return getOperations().bundle(vectors, tieBreaker);
}

export function similarity(a, b) {
    return a.similarity(b);
}

// Re-export interfaces
export * from './contract/semantic-vector.mjs';
export * from './contract/vector-factory.mjs';
export * from './contract/hdc-operations.mjs';
export * from './contract/hdc-properties.mjs';
```

---

## Migrarea Codului Existent

### Fișiere de Modificat în src/core/

| Fișier | Acțiune | Detalii |
|--------|---------|---------|
| `vector.mjs` | ÎNLOCUIT | Devine re-export din facade + backward compat class |
| `operations.mjs` | ÎNLOCUIT | Devine re-export din facade |
| `position.mjs` | MODIFICAT | Folosește `getFactory()` în loc de `new Vector()` |
| `constants.mjs` | PĂSTRAT | Geometry, thresholds rămân |
| `index.mjs` | MODIFICAT | Re-exportă din facade |

### Exemplu: position.mjs refactored

```javascript
// ÎNAINTE (cuplat la Vector)
import { Vector } from './vector.mjs';
import { bind } from './operations.mjs';

const positions = [];
for (let i = 1; i <= 20; i++) {
    positions[i] = asciiStamp(`__Pos${i}__`, 'Core', DEFAULT_GEOMETRY);
}

// DUPĂ (decuplat, folosește contract)
import { getFactory, bind } from '../hdc/facade.mjs';

let positions = null;

function ensurePositions(geometry) {
    if (!positions || positions.geometry !== geometry) {
        const factory = getFactory();
        positions = {
            geometry,
            vectors: []
        };
        for (let i = 1; i <= 20; i++) {
            positions.vectors[i] = factory.createFromName(
                `__Pos${i}__`,
                'Core',
                geometry
            );
        }
    }
    return positions.vectors;
}

export function getPosition(index, geometry = DEFAULT_GEOMETRY) {
    return ensurePositions(geometry)[index];
}
```

---

## Strategia Dense Binary (Refactored)

Codul curent din `vector.mjs` și `operations.mjs` devine:

```
src/hdc/strategies/dense-binary/
├── dense-vector.mjs       # Clasa DenseBinaryVector (ex-Vector)
├── dense-operations.mjs   # bind, bundle, similarity (ex-operations)
├── dense-factory.mjs      # Factory cu ASCII stamp
├── dense-properties.mjs   # { capacity: 200, bytesPerVector: geo/8, ... }
└── index.mjs              # Exportă strategia completă
```

### dense-vector.mjs (schelet)
```javascript
import { ISemanticVector, SerializedVector } from '../../contract/semantic-vector.mjs';

export class DenseBinaryVector implements ISemanticVector {
    // Implementarea ACTUALĂ din vector.mjs
    // Cu Uint32Array, getBit, setBit, popcount, etc.

    constructor(geometry, data = null) {
        this.geometry = geometry;
        this.words = Math.ceil(geometry / 32);
        this.data = data || new Uint32Array(this.words);
    }

    bind(other) {
        // XOR implementation
        const result = this.clone();
        for (let i = 0; i < this.words; i++) {
            result.data[i] ^= other.data[i];
        }
        return result;
    }

    similarity(other) {
        // Hamming-based similarity
        let different = 0;
        for (let i = 0; i < this.words; i++) {
            let xor = this.data[i] ^ other.data[i];
            while (xor) { xor &= xor - 1; different++; }
        }
        return 1 - (different / this.geometry);
    }

    serialize() {
        return {
            strategyId: 'dense-binary',
            geometry: this.geometry,
            data: Array.from(this.data),
            version: 1
        };
    }

    // ... restul metodelor
}
```

---

## Modificări în Specificații (DS)

### DS01-Theoretical-Foundation.md
Adaugă secțiune nouă:

```markdown
## 1.11 Implementation Strategies

AGISystem2's theoretical foundation is **implementation-agnostic**.
The core properties (bind associativity, similarity range, bundle
superposition) hold regardless of the underlying representation.

### 1.11.1 Strategy Contract

Any valid HDC implementation MUST satisfy:

| Property | Requirement |
|----------|-------------|
| bind(a, a) | Produces "zero" (all-cancel effect) |
| bind(a, bind(a, b)) | ≈ b (reversibility) |
| similarity(v, v) | = 1.0 |
| similarity(random, random) | ≈ 0.5 ± ε |
| bundle([a,b]).similarity(a) | > 0.5 for small n |

### 1.11.2 Reference Strategy: Dense Binary

The reference implementation uses dense binary vectors:
- Storage: `Uint32Array` with `geometry/32` words
- Bind: Bitwise XOR
- Bundle: Majority vote per bit
- Similarity: 1 - (Hamming distance / geometry)

See DS09A for implementation details.

### 1.11.3 Alternative Strategies

Other valid strategies include:
- **Sparse Polynomial**: Vectors as polynomials in GF(2)[x]
- **Weighted Integer**: Vectors as integer arrays with weighted ops
- **Hyperbolic**: Vectors in hyperbolic space

Each strategy has different non-functional properties (memory, speed,
capacity) but identical semantic guarantees.
```

### DS03-Architecture.md
Actualizează diagrama:

```markdown
## 3.1 Updated System Overview

```
AGISystem2Engine
    └── getSession(options) → Session
            │
            ├── HDC LAYER (Strategy-Based)
            │   ├── ISemanticVector      ← Contract
            │   ├── IVectorFactory       ← Contract
            │   ├── IHDCOperations       ← Contract
            │   └── Strategy Selection:
            │       ├── dense-binary (default)
            │       ├── sparse-polynomial
            │       └── [custom]
            │
            ├── LEARNING (strategy-agnostic)
            │   └── learn(dsl: string) → void
            ...
```

### 3.2 Strategy Selection

```javascript
const session = engine.getSession({
    hdcStrategy: 'dense-binary',  // or 'sparse-polynomial'
    geometry: 32768
});
```
```

### DS09-Core-HDC-Implementation.md
Redenumește și actualizează:

```markdown
# Chapter 9A: HDC Abstraction Layer

## 9A.1 Contract-First Design

This chapter defines the **HDC Contract** - the interface that all
implementation strategies must satisfy.

[... interfețele de mai sus ...]

## 9A.2 Reference Implementation: Dense Binary

The default strategy uses dense binary vectors as described in the
original HDC literature.

[... implementarea actuală, dar ca "reference" ...]
```

### DS-NOU: DS09C-HDC-Strategies.md
Fișier nou pentru strategii alternative:

```markdown
# Chapter 9C: Alternative HDC Strategies

## 9C.1 Sparse Polynomial Strategy

[... detalii despre implementare polinomială ...]

## 9C.2 Strategy Comparison

| Aspect | Dense Binary | Sparse Polynomial |
|--------|--------------|-------------------|
| Memory (32K geo) | 4 KB | Variable (depends on density) |
| Bind complexity | O(words) | O(non-zero terms) |
| Bundle complexity | O(n × geo) | O(n × avg_terms) |
| Best for | General use | Sparse representations |

## 9C.3 Implementing Custom Strategies

[... ghid pentru implementarea de strategii noi ...]
```

---

## Pași de Implementare

### Faza 1: Pregătire (non-breaking)
1. Creează `src/hdc/contract/` cu interfețele
2. Creează `src/hdc/strategies/dense-binary/` cu codul COPIAT din core/
3. Creează `src/hdc/facade.mjs`
4. Adaugă teste pentru contract compliance

### Faza 2: Migrare Internă
5. Modifică `src/core/vector.mjs` să re-exporte din facade
6. Modifică `src/core/operations.mjs` să re-exporte din facade
7. Modifică `src/core/position.mjs` să folosească factory
8. Rulează toate testele existente - trebuie să treacă FĂRĂ modificări

### Faza 3: Verificare Izolare
9. Adaugă test: instanțiază Session cu strategie mock
10. Verifică că reasoning/ și parser/ nu importă direct din strategies/
11. Adaugă lint rule: no direct imports from hdc/strategies/

### Faza 4: Strategie Alternativă (opțional)
12. Implementează `sparse-polynomial/`
13. Adaugă teste comparative
14. Benchmark performance

### Faza 5: Documentație
15. Actualizează DS01, DS03, DS09 conform planului
16. Adaugă DS09C pentru strategii alternative
17. Actualizează README cu opțiuni de configurare

---

## Verificare Izolare Completă

După refactorizare, următoarele importuri trebuie să fie SINGURELE puncte de contact:

```javascript
// PERMIS în src/runtime/, src/reasoning/, src/parser/, src/decoding/:
import {
    bind, bundle, similarity,     // operații
    createFromName, createVector, // factory
    getProperties,                // hints non-funcționale
    ISemanticVector               // type only
} from '../hdc/facade.mjs';

// INTERZIS:
import { DenseBinaryVector } from '../hdc/strategies/dense-binary/...';
import { Uint32Array } from '...';  // direct usage for vectors
```

---

## Criterii de Succes

1. **Toate testele existente trec** fără modificări la teste
2. **Zero import-uri directe** la strategii din layerele superioare
3. **Session poate fi instanțiat** cu strategie diferită prin config
4. **DS-urile actualizate** reflectă arhitectura bazată pe contract
5. **Benchmark** arată performanță echivalentă pentru dense-binary refactored

---

## Riscuri și Mitigări

| Risc | Impact | Mitigare |
|------|--------|----------|
| Breaking changes în API | High | Re-export backward compat în core/ |
| Performanță degradată | Medium | Benchmark înainte/după, inline critical paths |
| Complexitate crescută | Medium | Facade pattern ascunde complexitatea |
| Strategii incompatibile | Low | Contract strict + teste de compliance |

---

*Acest plan poate fi executat în altă sesiune. Fiecare fază e independentă și testabilă.*
