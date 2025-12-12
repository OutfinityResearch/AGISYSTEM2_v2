# Module Plan: src/core/vector.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-01, FS-04, NFS-30, NFS-34

---

## 1. Purpose

Provides the fundamental hypervector data structure for AGISystem2. This module handles vector storage, bit manipulation, serialization, and basic operations.

---

## 2. Responsibilities

- Store binary vectors efficiently using BigInt arrays
- Provide bit-level read/write access
- Support multiple geometries (1024, 8192, 32768, 65536)
- Enable vector cloning and extension
- Implement serialization/deserialization

---

## 3. Public API

### 3.1 Vector Class

```javascript
class Vector {
  constructor(geometry = 32768)

  // Bit operations
  getBit(index: number): 0 | 1
  setBit(index: number, value: 0 | 1): void
  flipBit(index: number): void

  // Properties
  get geometry(): number
  get words(): BigInt[]
  get density(): number  // Fraction of 1-bits
  popcount(): number     // Total 1-bits

  // Creation
  static zero(geometry: number): Vector
  static ones(geometry: number): Vector
  static random(geometry: number, seed?: number): Vector
  static fromBuffer(buffer: ArrayBuffer): Vector

  // Transformation
  clone(): Vector
  extend(newGeometry: number): Vector

  // Serialization
  toBuffer(): ArrayBuffer
  toHex(): string
  static fromHex(hex: string, geometry: number): Vector

  // Comparison
  equals(other: Vector): boolean
}
```

### 3.2 Constants

```javascript
const WORD_BITS = 64n;
const SUPPORTED_GEOMETRIES = [1024, 8192, 32768, 65536];
```

---

## 4. Internal Design

### 4.1 Storage Format

```
Vector with geometry G:
  - words: BigInt array of length ceil(G / 64)
  - Each BigInt stores 64 bits
  - Bit 0 is LSB of words[0]
  - Bit 63 is MSB of words[0]
  - Bit 64 is LSB of words[1]
  - etc.
```

### 4.2 Key Algorithms

**getBit(index)**
```javascript
getBit(index) {
  const wordIndex = Math.floor(index / 64);
  const bitIndex = BigInt(index % 64);
  return (this.words[wordIndex] >> bitIndex) & 1n ? 1 : 0;
}
```

**setBit(index, value)**
```javascript
setBit(index, value) {
  const wordIndex = Math.floor(index / 64);
  const bitIndex = BigInt(index % 64);
  const mask = 1n << bitIndex;
  if (value) {
    this.words[wordIndex] |= mask;
  } else {
    this.words[wordIndex] &= ~mask;
  }
}
```

**popcount()**
```javascript
popcount() {
  let count = 0;
  for (const word of this.words) {
    count += popcount64(word);  // Use efficient bit-counting
  }
  return count;
}
```

**extend(newGeometry)**
```javascript
extend(newGeometry) {
  if (newGeometry <= this.geometry) return this.clone();

  const ratio = newGeometry / this.geometry;
  const newVector = Vector.zero(newGeometry);

  // Clone pattern: [v] -> [v|v|v|...]
  for (let i = 0; i < ratio; i++) {
    const offset = i * this.words.length;
    for (let j = 0; j < this.words.length; j++) {
      newVector.words[offset + j] = this.words[j];
    }
  }

  return newVector;
}
```

---

## 5. Dependencies

- None (leaf module)

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| VEC-01 | Create 32K vector | geometry=32768, words.length=512 |
| VEC-02 | Set and get bits | Round-trip preserves values |
| VEC-03 | Popcount of random | ~16384 for 32K vector |
| VEC-04 | Extend 16K to 32K | Cloned pattern, same similarity |
| VEC-05 | Serialize/deserialize | Round-trip equals original |
| VEC-06 | Invalid geometry | Throws error |

---

## 7. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| getBit | < 10ns | Benchmark |
| setBit | < 10ns | Benchmark |
| popcount | < 100us | Benchmark |
| clone | < 50us | Benchmark |
| extend | < 100us | Benchmark |

---

## 8. Error Handling

| Error | Condition | Action |
|-------|-----------|--------|
| InvalidGeometry | Unsupported geometry value | Throw with supported list |
| IndexOutOfBounds | Bit index >= geometry | Throw with valid range |

---

*End of Module Plan*
