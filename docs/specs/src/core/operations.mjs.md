# Module Plan: src/core/operations.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-01, FS-02, FS-03, NFS-06, NFS-07, NFS-08

---

## 1. Purpose

Implements the three core HDC operations: Bind (XOR), Bundle (Majority Vote), and Similarity. These are the fundamental operations upon which all reasoning is built.

---

## 2. Responsibilities

- Implement Bind operation (bitwise XOR)
- Implement Bundle operation (bitwise majority)
- Implement Similarity calculation (normalized Hamming distance)
- Provide batch operations for efficiency
- Support mixed-geometry operations with automatic extension

---

## 3. Public API

### 3.1 Core Operations

```javascript
// Bind (XOR) - Association
function bind(a: Vector, b: Vector): Vector
function bindAll(vectors: Vector[]): Vector

// Bundle (Majority) - Superposition
function bundle(vectors: Vector[]): Vector
function bundleWeighted(vectors: Vector[], weights: number[]): Vector

// Similarity - Comparison
function similarity(a: Vector, b: Vector): number  // 0.0 to 1.0
function hammingDistance(a: Vector, b: Vector): number

// Search
function mostSimilar(query: Vector, vocabulary: Map<string, Vector>): {name: string, similarity: number}
function topKSimilar(query: Vector, vocabulary: Map<string, Vector>, k: number): Array<{name: string, similarity: number}>
```

### 3.2 Utility Functions

```javascript
// NOT operation
function invert(v: Vector): Vector

// Check if vectors are compatible
function compatible(a: Vector, b: Vector): boolean

// Extend to common geometry
function alignGeometry(vectors: Vector[]): Vector[]
```

---

## 4. Internal Design

### 4.1 Bind Implementation

```javascript
function bind(a, b) {
  // Ensure same geometry
  const [va, vb] = alignGeometry([a, b]);

  const result = Vector.zero(va.geometry);
  for (let i = 0; i < va.words.length; i++) {
    result.words[i] = va.words[i] ^ vb.words[i];
  }
  return result;
}

function bindAll(vectors) {
  if (vectors.length === 0) return Vector.zero(32768);
  if (vectors.length === 1) return vectors[0].clone();

  let result = vectors[0].clone();
  for (let i = 1; i < vectors.length; i++) {
    result = bind(result, vectors[i]);
  }
  return result;
}
```

### 4.2 Bundle Implementation

```javascript
function bundle(vectors) {
  if (vectors.length === 0) return Vector.zero(32768);
  if (vectors.length === 1) return vectors[0].clone();

  const aligned = alignGeometry(vectors);
  const geometry = aligned[0].geometry;
  const threshold = Math.floor(vectors.length / 2);

  const result = Vector.zero(geometry);

  for (let bit = 0; bit < geometry; bit++) {
    let count = 0;
    for (const v of aligned) {
      count += v.getBit(bit);
    }
    // Majority: > threshold sets bit
    // Tie-breaking: random or alternate
    if (count > threshold) {
      result.setBit(bit, 1);
    } else if (count === threshold && vectors.length % 2 === 0) {
      // Tie: use position parity for determinism
      result.setBit(bit, bit % 2);
    }
  }

  return result;
}
```

### 4.3 Similarity Implementation

```javascript
function similarity(a, b) {
  const dist = hammingDistance(a, b);
  return 1.0 - (dist / a.geometry);
}

function hammingDistance(a, b) {
  const [va, vb] = alignGeometry([a, b]);
  let distance = 0;

  for (let i = 0; i < va.words.length; i++) {
    // XOR gives differing bits, popcount counts them
    distance += popcount64(va.words[i] ^ vb.words[i]);
  }

  return distance;
}

function topKSimilar(query, vocabulary, k) {
  const results = [];

  for (const [name, vector] of vocabulary) {
    const sim = similarity(query, vector);
    results.push({ name, similarity: sim });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}
```

### 4.4 Optimized Bundle (Word-level)

```javascript
function bundleOptimized(vectors) {
  // Process 64 bits at a time using bit manipulation
  const aligned = alignGeometry(vectors);
  const numWords = aligned[0].words.length;
  const n = vectors.length;
  const threshold = n >> 1;

  const result = Vector.zero(aligned[0].geometry);

  for (let w = 0; w < numWords; w++) {
    let majority = 0n;

    for (let bit = 0; bit < 64; bit++) {
      let count = 0;
      const mask = 1n << BigInt(bit);

      for (const v of aligned) {
        if (v.words[w] & mask) count++;
      }

      if (count > threshold) {
        majority |= mask;
      }
    }

    result.words[w] = majority;
  }

  return result;
}
```

---

## 5. Dependencies

- `./vector.js` - Vector class

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| OP-01 | bind(A, B) commutative | bind(A,B) equals bind(B,A) |
| OP-02 | bind(A, A) = zero | Result is all zeros |
| OP-03 | bind is reversible | bind(bind(A,B), B) equals A |
| OP-04 | bundle([A,B,C]) similar to all | sim > 0.5 for each |
| OP-05 | similarity(A, A) = 1.0 | Exact identity |
| OP-06 | similarity(random, random) ~0.5 | Within [0.48, 0.52] |
| OP-07 | topKSimilar returns sorted | Descending by similarity |
| OP-08 | Mixed geometry auto-extends | Operations succeed |

---

## 7. Performance Requirements

| Operation | Target (32K) | Measurement |
|-----------|--------------|-------------|
| bind | < 50us | Benchmark |
| bundle(10 vectors) | < 1ms | Benchmark |
| bundle(100 vectors) | < 10ms | Benchmark |
| similarity | < 50us | Benchmark |
| topKSimilar(1000 vocab) | < 50ms | Benchmark |

---

## 8. Mathematical Properties to Verify

| Property | Test |
|----------|------|
| Bind commutativity | A XOR B = B XOR A |
| Bind associativity | (A XOR B) XOR C = A XOR (B XOR C) |
| Bind self-inverse | A XOR A = 0 |
| Bind reversibility | (A XOR B) XOR B = A |
| Bundle similarity | sim(bundle([A,B,C]), A) > 0.5 |
| Similarity symmetry | sim(A,B) = sim(B,A) |
| Similarity bounds | 0.0 <= sim(A,B) <= 1.0 |

---

*End of Module Plan*
