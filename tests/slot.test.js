/**
 * Tests for Slot model (js/game/Slot.js)
 *
 * Slot is a sorting bin with optional color/shape acceptance criteria.
 * Key behaviors:
 *   - accepts(gem) checks color AND shape constraints
 *   - addGem(gem) pushes the gem and updates its state + position
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Slot } from '../js/game/Slot.js';
import { Gem } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('Slot — construction', () => {
  it('should store basic properties', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 100, y: 200 });
    assert.equal(slot.id, 0);
    assert.equal(slot.label, 'Red');
    assert.equal(slot.acceptColor, 'red');
    assert.equal(slot.acceptShape, null);
    assert.equal(slot.x, 100);
    assert.equal(slot.y, 200);
  });

  it('should use default width and height when not provided', () => {
    const slot = new Slot({ id: 0, label: 'Test', x: 0, y: 0 });
    assert.equal(slot.width, 70);
    assert.equal(slot.height, 80);
  });

  it('should allow custom width and height', () => {
    const slot = new Slot({ id: 0, label: 'Test', x: 0, y: 0, width: 100, height: 120 });
    assert.equal(slot.width, 100);
    assert.equal(slot.height, 120);
  });

  it('should start with an empty contents array', () => {
    const slot = new Slot({ id: 0, label: 'Test', x: 0, y: 0 });
    assert.deepEqual(slot.contents, []);
  });
});

// ---------------------------------------------------------------------------
// accepts(gem) — acceptance logic
// ---------------------------------------------------------------------------

describe('Slot.accepts(gem)', () => {
  it('should accept any gem when no color or shape constraint is set', () => {
    const slot = new Slot({ id: 0, label: 'Any', x: 0, y: 0 });
    assert.ok(slot.accepts(new Gem('red', 'circle')));
    assert.ok(slot.accepts(new Gem('blue', 'star')));
    assert.ok(slot.accepts(new Gem('green', 'hexagon')));
  });

  it('should accept matching color when only color constraint is set', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    assert.ok(slot.accepts(new Gem('red', 'circle')));
    assert.ok(slot.accepts(new Gem('red', 'diamond')));
  });

  it('should reject non-matching color', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    assert.ok(!slot.accepts(new Gem('blue', 'circle')));
    assert.ok(!slot.accepts(new Gem('green', 'star')));
  });

  it('should accept matching shape when only shape constraint is set', () => {
    const slot = new Slot({ id: 0, label: 'Circles', acceptShape: 'circle', x: 0, y: 0 });
    assert.ok(slot.accepts(new Gem('red', 'circle')));
    assert.ok(slot.accepts(new Gem('blue', 'circle')));
  });

  it('should reject non-matching shape', () => {
    const slot = new Slot({ id: 0, label: 'Circles', acceptShape: 'circle', x: 0, y: 0 });
    assert.ok(!slot.accepts(new Gem('red', 'diamond')));
    assert.ok(!slot.accepts(new Gem('blue', 'star')));
  });

  it('should require BOTH color AND shape when both constraints are set', () => {
    const slot = new Slot({
      id: 0, label: 'Red Circle',
      acceptColor: 'red', acceptShape: 'circle',
      x: 0, y: 0,
    });
    assert.ok(slot.accepts(new Gem('red', 'circle')), 'exact match should accept');
    assert.ok(!slot.accepts(new Gem('red', 'diamond')), 'wrong shape should reject');
    assert.ok(!slot.accepts(new Gem('blue', 'circle')), 'wrong color should reject');
    assert.ok(!slot.accepts(new Gem('blue', 'diamond')), 'both wrong should reject');
  });
});

// ---------------------------------------------------------------------------
// addGem(gem) — state mutation
// ---------------------------------------------------------------------------

describe('Slot.addGem(gem)', () => {
  it('should add the gem to contents', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 100, y: 200 });
    const gem = new Gem('red', 'circle');
    slot.addGem(gem);
    assert.equal(slot.contents.length, 1);
    assert.equal(slot.contents[0], gem);
  });

  it('should set gem state to in_slot', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 100, y: 200 });
    const gem = new Gem('red', 'circle');
    slot.addGem(gem);
    assert.equal(gem.state, 'in_slot');
  });

  it('should position the gem centered horizontally in the slot', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 100, y: 200, width: 70, height: 80 });
    const gem = new Gem('red', 'circle');
    slot.addGem(gem);
    assert.equal(gem.x, 100 + 70 / 2);  // slot.x + slot.width / 2
    assert.equal(gem.y, 200 + 15);        // slot.y + 15
  });

  it('should accumulate multiple gems', () => {
    const slot = new Slot({ id: 0, label: 'Any', x: 0, y: 0 });
    slot.addGem(new Gem('red', 'circle'));
    slot.addGem(new Gem('blue', 'diamond'));
    slot.addGem(new Gem('green', 'star'));
    assert.equal(slot.contents.length, 3);
  });
});
