/**
 * AGISystem2 - Binary Hyperdimensional Vector
 * @module core/vector
 *
 * Implements bit-packed vectors using Uint32Array for efficient
 * hyperdimensional computing operations.
 */

import { DEFAULT_GEOMETRY } from './constants.mjs';

export class Vector {
  /**
   * Create a new Vector
   * @param {number} geometry - Number of bits (dimension)
   */
  constructor(geometry = DEFAULT_GEOMETRY) {
    if (geometry <= 0 || geometry % 32 !== 0) {
      throw new Error(`Geometry must be positive and divisible by 32, got ${geometry}`);
    }
    this.geometry = geometry;
    this.words = Math.ceil(geometry / 32);
    this.data = new Uint32Array(this.words);
  }

  /**
   * Get bit value at index
   * @param {number} index - Bit index (0 to geometry-1)
   * @returns {number} 0 or 1
   */
  getBit(index) {
    if (index < 0 || index >= this.geometry) {
      throw new RangeError(`Bit index ${index} out of range [0, ${this.geometry})`);
    }
    const wordIndex = Math.floor(index / 32);
    const bitOffset = index % 32;
    return (this.data[wordIndex] >>> bitOffset) & 1;
  }

  /**
   * Set bit value at index
   * @param {number} index - Bit index (0 to geometry-1)
   * @param {number} value - 0 or 1
   * @returns {Vector} this (for chaining)
   */
  setBit(index, value) {
    if (index < 0 || index >= this.geometry) {
      throw new RangeError(`Bit index ${index} out of range [0, ${this.geometry})`);
    }
    const wordIndex = Math.floor(index / 32);
    const bitOffset = index % 32;
    if (value) {
      this.data[wordIndex] |= (1 << bitOffset);
    } else {
      this.data[wordIndex] &= ~(1 << bitOffset);
    }
    return this;
  }

  /**
   * Count number of 1 bits (population count)
   * @returns {number} Number of set bits
   */
  popcount() {
    let count = 0;
    for (let i = 0; i < this.words; i++) {
      let n = this.data[i];
      // Brian Kernighan's algorithm
      while (n) {
        n &= n - 1;
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate density (fraction of bits set)
   * @returns {number} Value between 0 and 1
   */
  density() {
    return this.popcount() / this.geometry;
  }

  /**
   * Create a clone of this vector
   * @returns {Vector} New vector with copied data
   */
  clone() {
    const v = new Vector(this.geometry);
    v.data.set(this.data);
    return v;
  }

  /**
   * Extend vector to larger geometry
   * @param {number} newGeometry - New dimension (must be >= current)
   * @returns {Vector} New extended vector
   */
  extend(newGeometry) {
    if (newGeometry < this.geometry) {
      throw new Error(`Cannot shrink vector from ${this.geometry} to ${newGeometry}`);
    }
    if (newGeometry === this.geometry) {
      return this.clone();
    }
    const v = new Vector(newGeometry);
    v.data.set(this.data);
    return v;
  }

  /**
   * XOR this vector with another (in place)
   * @param {Vector} other - Vector to XOR with
   * @returns {Vector} this (for chaining)
   */
  xorInPlace(other) {
    if (other.geometry !== this.geometry) {
      throw new Error(`Geometry mismatch: ${this.geometry} vs ${other.geometry}`);
    }
    for (let i = 0; i < this.words; i++) {
      this.data[i] ^= other.data[i];
    }
    return this;
  }

  /**
   * AND this vector with another (in place)
   * @param {Vector} other - Vector to AND with
   * @returns {Vector} this (for chaining)
   */
  andInPlace(other) {
    if (other.geometry !== this.geometry) {
      throw new Error(`Geometry mismatch: ${this.geometry} vs ${other.geometry}`);
    }
    for (let i = 0; i < this.words; i++) {
      this.data[i] &= other.data[i];
    }
    return this;
  }

  /**
   * OR this vector with another (in place)
   * @param {Vector} other - Vector to OR with
   * @returns {Vector} this (for chaining)
   */
  orInPlace(other) {
    if (other.geometry !== this.geometry) {
      throw new Error(`Geometry mismatch: ${this.geometry} vs ${other.geometry}`);
    }
    for (let i = 0; i < this.words; i++) {
      this.data[i] |= other.data[i];
    }
    return this;
  }

  /**
   * NOT (invert all bits) in place
   * @returns {Vector} this (for chaining)
   */
  notInPlace() {
    for (let i = 0; i < this.words; i++) {
      this.data[i] = ~this.data[i] >>> 0;
    }
    return this;
  }

  /**
   * Set all bits to zero
   * @returns {Vector} this (for chaining)
   */
  zero() {
    this.data.fill(0);
    return this;
  }

  /**
   * Set all bits to one
   * @returns {Vector} this (for chaining)
   */
  ones() {
    this.data.fill(0xFFFFFFFF);
    return this;
  }

  /**
   * Check if vectors are equal
   * @param {Vector} other - Vector to compare
   * @returns {boolean} true if equal
   */
  equals(other) {
    if (other.geometry !== this.geometry) return false;
    for (let i = 0; i < this.words; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }

  /**
   * Serialize vector to JSON-compatible object
   * @returns {Object} Serialized representation
   */
  serialize() {
    return {
      geometry: this.geometry,
      data: Array.from(this.data)
    };
  }

  /**
   * Create vector from serialized data
   * @param {Object} obj - Serialized vector object
   * @returns {Vector} Restored vector
   */
  static deserialize(obj) {
    const v = new Vector(obj.geometry);
    v.data.set(obj.data);
    return v;
  }

  /**
   * Create a random vector with ~50% density
   * @param {number} geometry - Vector dimension
   * @param {Function} randomFn - Random function returning 0-1
   * @returns {Vector} Random vector
   */
  static random(geometry, randomFn = Math.random) {
    const v = new Vector(geometry);
    for (let i = 0; i < v.words; i++) {
      v.data[i] = (randomFn() * 0xFFFFFFFF) >>> 0;
    }
    return v;
  }

  /**
   * Create zero vector
   * @param {number} geometry - Vector dimension
   * @returns {Vector} Zero vector
   */
  static zeros(geometry) {
    return new Vector(geometry);
  }

  /**
   * Create vector with all bits set
   * @param {number} geometry - Vector dimension
   * @returns {Vector} All-ones vector
   */
  static ones(geometry) {
    const v = new Vector(geometry);
    v.data.fill(0xFFFFFFFF);
    return v;
  }
}

export default Vector;
