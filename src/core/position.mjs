/**
 * AGISystem2 - Position Vectors
 * @module core/position
 *
 * Position vectors (Pos1, Pos2, ..., Pos20) provide argument ordering
 * without relying on permutation. Each position vector is orthogonal
 * to all others.
 */

import { Vector } from './vector.mjs';
import { bind, unbind } from './operations.mjs';
import { asciiStamp } from '../util/ascii-stamp.mjs';
import { MAX_POSITIONS, DEFAULT_GEOMETRY } from './constants.mjs';

// Cache for position vectors (per geometry)
const positionCache = new Map();

/**
 * Get position vector for given position and geometry
 * @param {number} position - Position number (1-20)
 * @param {number} geometry - Vector dimension
 * @returns {Vector} Position vector
 */
export function getPositionVector(position, geometry = DEFAULT_GEOMETRY) {
  if (position < 1 || position > MAX_POSITIONS) {
    throw new RangeError(`Position must be 1-${MAX_POSITIONS}, got ${position}`);
  }

  const cacheKey = `${geometry}:${position}`;
  if (positionCache.has(cacheKey)) {
    return positionCache.get(cacheKey);
  }

  // Generate deterministic position vector
  const posVec = asciiStamp(`__POS_${position}__`, geometry);
  positionCache.set(cacheKey, posVec);
  return posVec;
}

/**
 * Initialize all position vectors for a geometry
 * @param {number} geometry - Vector dimension
 * @returns {Vector[]} Array of position vectors (index 0 = Pos1)
 */
export function initPositionVectors(geometry = DEFAULT_GEOMETRY) {
  const vectors = [];
  for (let i = 1; i <= MAX_POSITIONS; i++) {
    vectors.push(getPositionVector(i, geometry));
  }
  return vectors;
}

/**
 * Bind a vector with its position marker
 * @param {number} position - Argument position (1-based)
 * @param {Vector} vector - Vector to position
 * @returns {Vector} Positioned vector
 */
export function withPosition(position, vector) {
  const posVec = getPositionVector(position, vector.geometry);
  return bind(vector, posVec);
}

/**
 * Remove position marker from a vector
 * @param {number} position - Position to remove
 * @param {Vector} vector - Positioned vector
 * @returns {Vector} Unpositioned vector
 */
export function removePosition(position, vector) {
  const posVec = getPositionVector(position, vector.geometry);
  return unbind(vector, posVec);
}

/**
 * Extract content at a specific position from composite
 * @param {number} position - Position to extract
 * @param {Vector} composite - Composite vector
 * @returns {Vector} Content at that position
 */
export function extractAtPosition(position, composite) {
  return removePosition(position, composite);
}

/**
 * Clear position vector cache
 */
export function clearPositionCache() {
  positionCache.clear();
}

export default {
  getPositionVector,
  initPositionVectors,
  withPosition,
  removePosition,
  extractAtPosition,
  clearPositionCache
};
