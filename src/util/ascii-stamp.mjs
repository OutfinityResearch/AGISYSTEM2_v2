/**
 * AGISystem2 - ASCII Stamp Generator
 * @module util/ascii-stamp
 *
 * Generates deterministic hypervectors from ASCII strings.
 * Each unique string produces a unique ~50% dense vector.
 */

import { Vector } from '../core/vector.mjs';
import { PRNG } from './prng.mjs';
import { djb2 } from './hash.mjs';

/**
 * Generate a deterministic vector from a string identifier
 * @param {string} identifier - String to encode
 * @param {number} geometry - Vector dimension
 * @returns {Vector} Deterministic random vector
 */
export function asciiStamp(identifier, geometry) {
  // Create seeded PRNG from identifier hash
  const seed = djb2(identifier);
  const prng = new PRNG(seed);

  // Generate random vector
  const v = new Vector(geometry);
  for (let i = 0; i < v.words; i++) {
    v.data[i] = prng.randomUint32();
  }

  return v;
}

/**
 * Generate multiple orthogonal vectors from base identifier
 * @param {string} baseId - Base identifier
 * @param {number} count - Number of vectors
 * @param {number} geometry - Vector dimension
 * @returns {Vector[]} Array of vectors
 */
export function asciiStampBatch(baseId, count, geometry) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    vectors.push(asciiStamp(`${baseId}:${i}`, geometry));
  }
  return vectors;
}

export default asciiStamp;
