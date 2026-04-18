/**
 * Tests for Gem model (js/game/Gem.js)
 *
 * Gem is a simple data class with an auto-incrementing id, color, shape,
 * position, state, and opacity. These tests verify construction and
 * that the exported constants are complete.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Gem, GEM_COLORS, GEM_SHAPES } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('Gem', () => {
  it('should set color and shape from constructor arguments', () => {
    const gem = new Gem('red', 'circle');
    assert.equal(gem.color, 'red');
    assert.equal(gem.shape, 'circle');
  });

  it('should assign unique auto-incrementing ids', () => {
    const a = new Gem('blue', 'diamond');
    const b = new Gem('green', 'star');
    assert.notEqual(a.id, b.id);
    assert.ok(b.id > a.id, 'second gem id should be greater than first');
  });

  it('should start at position (0, 0)', () => {
    const gem = new Gem('red', 'circle');
    assert.equal(gem.x, 0);
    assert.equal(gem.y, 0);
  });

  it('should default to on_belt state', () => {
    const gem = new Gem('red', 'circle');
    assert.equal(gem.state, 'on_belt');
  });

  it('should default to full opacity', () => {
    const gem = new Gem('red', 'circle');
    assert.equal(gem.opacity, 1);
  });
});

// ---------------------------------------------------------------------------
// GEM_COLORS constant
// ---------------------------------------------------------------------------

describe('GEM_COLORS', () => {
  it('should contain all six game colors', () => {
    const expected = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    for (const color of expected) {
      assert.ok(color in GEM_COLORS, `missing color: ${color}`);
    }
  });

  it('each color value should be a valid hex string', () => {
    for (const [name, hex] of Object.entries(GEM_COLORS)) {
      assert.match(hex, /^#[0-9a-fA-F]{6}$/, `${name} has invalid hex: ${hex}`);
    }
  });
});

// ---------------------------------------------------------------------------
// GEM_SHAPES constant
// ---------------------------------------------------------------------------

describe('GEM_SHAPES', () => {
  it('should contain all five game shapes', () => {
    const expected = ['circle', 'diamond', 'triangle', 'star', 'hexagon'];
    assert.deepEqual(GEM_SHAPES, expected);
  });
});
