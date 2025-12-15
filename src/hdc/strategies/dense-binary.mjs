/**
 * AGISystem2 - Dense Binary HDC Strategy
 * @module hdc/strategies/dense-binary
 *
 * Reference implementation using dense binary vectors (Uint32Array).
 * This is the default strategy, implementing the classic HDC approach.
 *
 * Properties:
 * - Storage: Uint32Array with geometry/32 words
 * - Bind: Bitwise XOR (self-inverse, associative, commutative)
 * - Bundle: Majority vote per bit
 * - Similarity: 1 - (Hamming distance / geometry)
 */

import { PRNG } from '../../util/prng.mjs';
import { djb2 } from '../../util/hash.mjs';

// ============================================================================
// VECTOR CLASS (Internal - not exported directly)
// ============================================================================

/**
 * Dense binary vector using Uint32Array
 * @private
 */
class DenseBinaryVector {
  /**
   * @param {number} geometry - Number of bits
   * @param {Uint32Array} [data] - Optional pre-initialized data
   */
  constructor(geometry, data = null) {
    if (geometry <= 0 || geometry % 32 !== 0) {
      throw new Error(`Geometry must be positive and divisible by 32, got ${geometry}`);
    }
    this.geometry = geometry;
    this.words = Math.ceil(geometry / 32);
    this.data = data || new Uint32Array(this.words);
    this.strategyId = 'dense-binary';
  }

  getBit(index) {
    const wordIndex = Math.floor(index / 32);
    const bitOffset = index % 32;
    return (this.data[wordIndex] >>> bitOffset) & 1;
  }

  setBit(index, value) {
    const wordIndex = Math.floor(index / 32);
    const bitOffset = index % 32;
    if (value) {
      this.data[wordIndex] |= (1 << bitOffset);
    } else {
      this.data[wordIndex] &= ~(1 << bitOffset);
    }
    return this;
  }

  popcount() {
    let count = 0;
    for (let i = 0; i < this.words; i++) {
      let n = this.data[i];
      while (n) {
        n &= n - 1;
        count++;
      }
    }
    return count;
  }

  density() {
    return this.popcount() / this.geometry;
  }

  xorInPlace(other) {
    for (let i = 0; i < this.words; i++) {
      this.data[i] ^= other.data[i];
    }
    return this;
  }

  zero() {
    this.data.fill(0);
    return this;
  }

  ones() {
    this.data.fill(0xFFFFFFFF);
    return this;
  }

  // ========== INSTANCE METHODS FOR BACKWARD COMPAT ==========

  /**
   * Clone this vector
   * @returns {DenseBinaryVector}
   */
  clone() {
    const v = new DenseBinaryVector(this.geometry);
    v.data.set(this.data);
    return v;
  }

  /**
   * Extend vector to larger geometry (zero-pads)
   * @param {number} newGeometry
   * @returns {DenseBinaryVector}
   */
  extend(newGeometry) {
    if (newGeometry < this.geometry) {
      throw new Error(`Cannot shrink vector from ${this.geometry} to ${newGeometry}`);
    }
    if (newGeometry === this.geometry) {
      return this.clone();
    }
    const v = new DenseBinaryVector(newGeometry);
    v.data.set(this.data);
    return v;
  }

  /**
   * AND in place
   * @param {DenseBinaryVector} other
   * @returns {DenseBinaryVector}
   */
  andInPlace(other) {
    for (let i = 0; i < this.words; i++) {
      this.data[i] &= other.data[i];
    }
    return this;
  }

  /**
   * OR in place
   * @param {DenseBinaryVector} other
   * @returns {DenseBinaryVector}
   */
  orInPlace(other) {
    for (let i = 0; i < this.words; i++) {
      this.data[i] |= other.data[i];
    }
    return this;
  }

  /**
   * NOT in place
   * @returns {DenseBinaryVector}
   */
  notInPlace() {
    for (let i = 0; i < this.words; i++) {
      this.data[i] = ~this.data[i] >>> 0;
    }
    return this;
  }

  /**
   * Check equality
   * @param {DenseBinaryVector} other
   * @returns {boolean}
   */
  equals(other) {
    if (other.geometry !== this.geometry) return false;
    for (let i = 0; i < this.words; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }

  /**
   * Serialize to JSON-compatible object
   * @returns {Object}
   */
  serialize() {
    return {
      strategyId: 'dense-binary',
      geometry: this.geometry,
      version: 1,
      data: Array.from(this.data)
    };
  }

  // ========== STATIC METHODS FOR BACKWARD COMPAT ==========

  /**
   * Create random vector
   * @param {number} geometry
   * @param {function} [randomFn]
   * @returns {DenseBinaryVector}
   */
  static random(geometry, randomFn = Math.random) {
    const v = new DenseBinaryVector(geometry);
    for (let i = 0; i < v.words; i++) {
      v.data[i] = (randomFn() * 0xFFFFFFFF) >>> 0;
    }
    return v;
  }

  /**
   * Create zero vector
   * @param {number} geometry
   * @returns {DenseBinaryVector}
   */
  static zeros(geometry) {
    return new DenseBinaryVector(geometry);
  }

  /**
   * Create all-ones vector
   * @param {number} geometry
   * @returns {DenseBinaryVector}
   */
  static ones(geometry) {
    const v = new DenseBinaryVector(geometry);
    v.data.fill(0xFFFFFFFF);
    return v;
  }

  /**
   * Deserialize from object
   * @param {Object} obj
   * @returns {DenseBinaryVector}
   */
  static deserialize(obj) {
    const v = new DenseBinaryVector(obj.geometry);
    v.data.set(obj.data);
    return v;
  }
}

// ============================================================================
// STRATEGY PROPERTIES
// ============================================================================

const properties = {
  id: 'dense-binary',
  displayName: 'Dense Binary (Reference)',
  recommendedBundleCapacity: 7,
  maxBundleCapacity: 200,
  bytesPerVector: (geometry) => Math.ceil(geometry / 8),
  bindComplexity: 'O(n/32)',
  sparseOptimized: false,
  description: 'Classic HDC with dense binary vectors and XOR binding'
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create zero vector
 * @param {number} geometry
 * @returns {DenseBinaryVector}
 */
function createZero(geometry) {
  return new DenseBinaryVector(geometry);
}

/**
 * Create random vector with ~50% density
 * @param {number} geometry
 * @param {number} [seed] - Optional seed for determinism
 * @returns {DenseBinaryVector}
 */
function createRandom(geometry, seed = null) {
  const v = new DenseBinaryVector(geometry);
  if (seed !== null) {
    const prng = new PRNG(seed);
    for (let i = 0; i < v.words; i++) {
      v.data[i] = prng.randomUint32();
    }
  } else {
    for (let i = 0; i < v.words; i++) {
      v.data[i] = (Math.random() * 0xFFFFFFFF) >>> 0;
    }
  }
  return v;
}

/**
 * Create deterministic vector from name
 * Uses DJB2 hash as seed for PRNG
 * @param {string} name - Identifier string
 * @param {number} geometry
 * @returns {DenseBinaryVector}
 */
function createFromName(name, geometry) {
  const seed = djb2(name);
  const prng = new PRNG(seed);
  const v = new DenseBinaryVector(geometry);
  for (let i = 0; i < v.words; i++) {
    v.data[i] = prng.randomUint32();
  }
  return v;
}

/**
 * Deserialize vector from storage format
 * @param {Object} serialized
 * @returns {DenseBinaryVector}
 */
function deserialize(serialized) {
  if (serialized.strategyId !== 'dense-binary') {
    throw new Error(`Cannot deserialize ${serialized.strategyId} with dense-binary strategy`);
  }
  const v = new DenseBinaryVector(serialized.geometry);
  v.data.set(serialized.data);
  return v;
}

// ============================================================================
// CORE OPERATIONS
// ============================================================================

/**
 * Bind two vectors using XOR
 * @param {DenseBinaryVector} a
 * @param {DenseBinaryVector} b
 * @returns {DenseBinaryVector}
 */
function bind(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }
  const result = clone(a);
  result.xorInPlace(b);
  return result;
}

/**
 * Bind multiple vectors together
 * @param {...DenseBinaryVector} vectors
 * @returns {DenseBinaryVector}
 */
function bindAll(...vectors) {
  if (vectors.length === 0) {
    throw new Error('bindAll requires at least one vector');
  }
  if (vectors.length === 1) {
    return clone(vectors[0]);
  }
  let result = clone(vectors[0]);
  for (let i = 1; i < vectors.length; i++) {
    result.xorInPlace(vectors[i]);
  }
  return result;
}

/**
 * Bundle vectors using majority vote
 * @param {DenseBinaryVector[]} vectors
 * @param {DenseBinaryVector} [tieBreaker]
 * @returns {DenseBinaryVector}
 */
function bundle(vectors, tieBreaker = null) {
  if (vectors.length === 0) {
    throw new Error('bundle requires at least one vector');
  }
  if (vectors.length === 1) {
    return clone(vectors[0]);
  }

  const geometry = vectors[0].geometry;
  const threshold = vectors.length / 2;

  // Count 1s at each position
  const counts = new Uint16Array(geometry);
  for (const v of vectors) {
    if (v.geometry !== geometry) {
      throw new Error('All vectors must have same geometry');
    }
    for (let i = 0; i < geometry; i++) {
      if (v.getBit(i)) {
        counts[i]++;
      }
    }
  }

  // Create result using majority vote
  const result = new DenseBinaryVector(geometry);
  for (let i = 0; i < geometry; i++) {
    if (counts[i] > threshold) {
      result.setBit(i, 1);
    } else if (counts[i] === threshold && tieBreaker) {
      result.setBit(i, tieBreaker.getBit(i));
    }
  }

  return result;
}

/**
 * Calculate Hamming-based similarity (0-1)
 * @param {DenseBinaryVector} a
 * @param {DenseBinaryVector} b
 * @returns {number}
 */
function similarity(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }

  let differentBits = 0;
  for (let i = 0; i < a.words; i++) {
    let xor = a.data[i] ^ b.data[i];
    while (xor) {
      xor &= xor - 1;
      differentBits++;
    }
  }

  return 1 - (differentBits / a.geometry);
}

/**
 * Unbind (same as bind for XOR)
 * @param {DenseBinaryVector} composite
 * @param {DenseBinaryVector} component
 * @returns {DenseBinaryVector}
 */
function unbind(composite, component) {
  return bind(composite, component);
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Clone a vector
 * @param {DenseBinaryVector} v
 * @returns {DenseBinaryVector}
 */
function clone(v) {
  const result = new DenseBinaryVector(v.geometry);
  result.data.set(v.data);
  return result;
}

/**
 * Check vector equality
 * @param {DenseBinaryVector} a
 * @param {DenseBinaryVector} b
 * @returns {boolean}
 */
function equals(a, b) {
  if (a.geometry !== b.geometry) return false;
  for (let i = 0; i < a.words; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}

/**
 * Serialize vector for storage
 * @param {DenseBinaryVector} v
 * @returns {Object}
 */
function serialize(v) {
  return {
    strategyId: 'dense-binary',
    geometry: v.geometry,
    version: 1,
    data: Array.from(v.data)
  };
}

/**
 * Find top-K most similar vectors
 * @param {DenseBinaryVector} query
 * @param {Map<string, DenseBinaryVector>|Object} vocabulary
 * @param {number} k
 * @returns {Array<{name: string, similarity: number}>}
 */
function topKSimilar(query, vocabulary, k = 5) {
  const results = [];

  const entries = vocabulary instanceof Map
    ? vocabulary.entries()
    : Object.entries(vocabulary);

  for (const [name, vec] of entries) {
    const sim = similarity(query, vec);
    results.push({ name, similarity: sim });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
}

/**
 * Calculate distance (1 - similarity)
 * @param {DenseBinaryVector} a
 * @param {DenseBinaryVector} b
 * @returns {number}
 */
function distance(a, b) {
  return 1 - similarity(a, b);
}

/**
 * Check if vectors are approximately orthogonal
 * @param {DenseBinaryVector} a
 * @param {DenseBinaryVector} b
 * @param {number} threshold
 * @returns {boolean}
 */
function isOrthogonal(a, b, threshold = 0.55) {
  const sim = similarity(a, b);
  return sim < threshold && sim > (1 - threshold);
}

// ============================================================================
// KB SERIALIZATION (Strategy-level optimization)
// ============================================================================

/**
 * Serialize a knowledge base (collection of facts) for persistence.
 * Strategy-level serialization enables optimizations like:
 * - Shared geometry header
 * - Compressed data formats
 * - Batch operations
 *
 * @param {Array<{vector: DenseBinaryVector, name?: string, metadata?: Object}>} facts
 * @returns {Object} Serialized KB
 */
function serializeKB(facts) {
  if (!facts || facts.length === 0) {
    return {
      strategyId: 'dense-binary',
      version: 1,
      geometry: 0,
      count: 0,
      facts: []
    };
  }

  const geometry = facts[0].vector.geometry;

  return {
    strategyId: 'dense-binary',
    version: 1,
    geometry,
    count: facts.length,
    facts: facts.map(f => ({
      data: Array.from(f.vector.data),
      name: f.name || null,
      metadata: f.metadata || null
    }))
  };
}

/**
 * Deserialize a knowledge base from storage.
 *
 * @param {Object} serialized - Serialized KB object
 * @returns {Array<{vector: DenseBinaryVector, name?: string, metadata?: Object}>}
 */
function deserializeKB(serialized) {
  if (!serialized || !serialized.facts || serialized.count === 0) {
    return [];
  }

  const geometry = serialized.geometry;

  return serialized.facts.map(f => ({
    vector: deserialize({
      strategyId: serialized.strategyId,
      geometry,
      data: f.data
    }),
    name: f.name,
    metadata: f.metadata
  }));
}

// ============================================================================
// STRATEGY EXPORT
// ============================================================================

/**
 * Dense Binary Strategy Object
 * Implements the HDCStrategy contract
 */
export const denseBinaryStrategy = {
  id: 'dense-binary',
  properties,

  // Factory
  createZero,
  createRandom,
  createFromName,
  deserialize,

  // Core operations
  bind,
  bindAll,
  bundle,
  similarity,
  unbind,

  // Utilities
  clone,
  equals,
  serialize,
  topKSimilar,
  distance,
  isOrthogonal,

  // KB Serialization (strategy-level)
  serializeKB,
  deserializeKB,

  // Internal class (for backward compat and advanced use)
  Vector: DenseBinaryVector
};

export default denseBinaryStrategy;
