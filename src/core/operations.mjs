/**
 * AGISystem2 - HDC Operations
 * @module core/operations
 *
 * Core hyperdimensional computing operations:
 * - Bind (XOR): Associative binding of concepts
 * - Bundle (Majority): Superposition of vectors
 * - Similarity (Hamming): Cosine-like similarity measure
 */

import { Vector } from './vector.mjs';

/**
 * Bind two vectors using XOR
 * Binding is associative, commutative, and self-inverse.
 * @param {Vector} a - First vector
 * @param {Vector} b - Second vector
 * @returns {Vector} Bound result
 */
export function bind(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }
  const result = a.clone();
  result.xorInPlace(b);
  return result;
}

/**
 * Bind multiple vectors together
 * @param {...Vector} vectors - Vectors to bind
 * @returns {Vector} Combined result
 */
export function bindAll(...vectors) {
  if (vectors.length === 0) {
    throw new Error('bindAll requires at least one vector');
  }
  if (vectors.length === 1) {
    return vectors[0].clone();
  }
  let result = vectors[0].clone();
  for (let i = 1; i < vectors.length; i++) {
    result.xorInPlace(vectors[i]);
  }
  return result;
}

/**
 * Bundle vectors using majority vote (thresholded sum)
 * Creates a superposition where all bundled vectors remain retrievable.
 * @param {Vector[]} vectors - Vectors to bundle
 * @param {Vector} [tieBreaker] - Optional tiebreaker for even counts
 * @returns {Vector} Bundled result
 */
export function bundle(vectors, tieBreaker = null) {
  if (vectors.length === 0) {
    throw new Error('bundle requires at least one vector');
  }
  if (vectors.length === 1) {
    return vectors[0].clone();
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
  const result = new Vector(geometry);
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
 * Calculate Hamming-based similarity (normalized to 0-1)
 * @param {Vector} a - First vector
 * @param {Vector} b - Second vector
 * @returns {number} Similarity value (0 to 1)
 */
export function similarity(a, b) {
  if (a.geometry !== b.geometry) {
    throw new Error(`Geometry mismatch: ${a.geometry} vs ${b.geometry}`);
  }

  // XOR gives differing bits, count them
  let differentBits = 0;
  for (let i = 0; i < a.words; i++) {
    let xor = a.data[i] ^ b.data[i];
    // Popcount the XOR result
    while (xor) {
      xor &= xor - 1;
      differentBits++;
    }
  }

  // Convert Hamming distance to similarity
  // 0 different bits = 1.0 similarity
  // All different = 0.0 similarity
  return 1 - (differentBits / a.geometry);
}

/**
 * Calculate normalized Hamming distance
 * @param {Vector} a - First vector
 * @param {Vector} b - Second vector
 * @returns {number} Distance (0 to 1)
 */
export function distance(a, b) {
  return 1 - similarity(a, b);
}

/**
 * Find top-K most similar vectors from a collection
 * @param {Vector} query - Query vector
 * @param {Map<string, Vector>|Object} vocabulary - Name -> Vector mapping
 * @param {number} k - Number of results
 * @returns {Array<{name: string, similarity: number}>} Sorted results
 */
export function topKSimilar(query, vocabulary, k = 5) {
  const results = [];

  // Handle both Map and Object
  const entries = vocabulary instanceof Map
    ? vocabulary.entries()
    : Object.entries(vocabulary);

  for (const [name, vec] of entries) {
    const sim = similarity(query, vec);
    results.push({ name, similarity: sim });
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, k);
}

/**
 * Check if two vectors are approximately orthogonal
 * Random vectors tend to have ~0.5 similarity
 * @param {Vector} a - First vector
 * @param {Vector} b - Second vector
 * @param {number} threshold - Max similarity to consider orthogonal
 * @returns {boolean} True if orthogonal
 */
export function isOrthogonal(a, b, threshold = 0.55) {
  const sim = similarity(a, b);
  return sim < threshold && sim > (1 - threshold);
}

/**
 * Unbind: inverse of bind (same as bind for XOR)
 * @param {Vector} composite - Bound vector
 * @param {Vector} component - Component to remove
 * @returns {Vector} Remaining component
 */
export function unbind(composite, component) {
  // XOR is self-inverse: unbind(bind(a,b), b) = a
  return bind(composite, component);
}

export default {
  bind,
  bindAll,
  bundle,
  similarity,
  distance,
  topKSimilar,
  isOrthogonal,
  unbind
};
