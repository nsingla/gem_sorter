/**
 * Tests for BlockDefinitions (js/blocks/BlockDefinitions.js)
 *
 * Validates the block definition registry that drives the visual
 * programming palette. Each block def must have correct structure
 * for the workspace to render and serialize it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BLOCK_DEFS, CATEGORY_COLORS } from '../js/blocks/BlockDefinitions.js';
import { GEM_COLORS, GEM_SHAPES } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// BLOCK_DEFS structure
// ---------------------------------------------------------------------------

describe('BLOCK_DEFS — structure', () => {
  const allTypes = Object.keys(BLOCK_DEFS);

  it('should define all 7 block types', () => {
    const expected = ['if_color', 'if_shape', 'if_color_and_shape', 'pick_gem', 'place_in_slot', 'repeat', 'wait'];
    for (const type of expected) {
      assert.ok(type in BLOCK_DEFS, `missing block type: ${type}`);
    }
    assert.equal(allTypes.length, expected.length);
  });

  it('each block should have type, category, label, hasBody, and params', () => {
    for (const [key, def] of Object.entries(BLOCK_DEFS)) {
      assert.equal(def.type, key, `${key}: type field should match key`);
      assert.ok(['condition', 'action', 'flow'].includes(def.category),
        `${key}: invalid category "${def.category}"`);
      assert.ok(typeof def.label === 'string' && def.label.length > 0,
        `${key}: label should be non-empty string`);
      assert.ok(typeof def.hasBody === 'boolean',
        `${key}: hasBody should be boolean`);
      assert.ok(Array.isArray(def.params),
        `${key}: params should be an array`);
    }
  });
});

// ---------------------------------------------------------------------------
// Condition blocks
// ---------------------------------------------------------------------------

describe('BLOCK_DEFS — condition blocks', () => {
  it('if_color should have a color dropdown with all 6 colors', () => {
    const def = BLOCK_DEFS.if_color;
    assert.equal(def.category, 'condition');
    assert.ok(def.hasBody, 'if_color should have a body');
    assert.equal(def.params.length, 1);

    const colorParam = def.params[0];
    assert.equal(colorParam.name, 'color');
    assert.equal(colorParam.type, 'dropdown');
    assert.deepEqual(colorParam.options, Object.keys(GEM_COLORS));
  });

  it('if_shape should have a shape dropdown with all 5 shapes', () => {
    const def = BLOCK_DEFS.if_shape;
    assert.equal(def.category, 'condition');
    assert.ok(def.hasBody, 'if_shape should have a body');
    assert.equal(def.params.length, 1);

    const shapeParam = def.params[0];
    assert.equal(shapeParam.name, 'shape');
    assert.deepEqual(shapeParam.options, GEM_SHAPES);
  });

  it('if_color_and_shape should have both color and shape dropdowns', () => {
    const def = BLOCK_DEFS.if_color_and_shape;
    assert.equal(def.category, 'condition');
    assert.ok(def.hasBody);
    assert.equal(def.params.length, 2);

    assert.equal(def.params[0].name, 'color');
    assert.equal(def.params[1].name, 'shape');
  });
});

// ---------------------------------------------------------------------------
// Action blocks
// ---------------------------------------------------------------------------

describe('BLOCK_DEFS — action blocks', () => {
  it('pick_gem should have no params and no body', () => {
    const def = BLOCK_DEFS.pick_gem;
    assert.equal(def.category, 'action');
    assert.ok(!def.hasBody);
    assert.equal(def.params.length, 0);
  });

  it('place_in_slot should have a slot dropdown param and no body', () => {
    const def = BLOCK_DEFS.place_in_slot;
    assert.equal(def.category, 'action');
    assert.ok(!def.hasBody);
    assert.equal(def.params.length, 1);
    assert.equal(def.params[0].name, 'slot');
    // options are empty because they're populated dynamically from slotOptions
    assert.deepEqual(def.params[0].options, []);
  });
});

// ---------------------------------------------------------------------------
// Flow blocks
// ---------------------------------------------------------------------------

describe('BLOCK_DEFS — flow blocks', () => {
  it('repeat should have a count dropdown with forever and numeric options', () => {
    const def = BLOCK_DEFS.repeat;
    assert.equal(def.category, 'flow');
    assert.ok(def.hasBody, 'repeat should have a body');
    assert.equal(def.params.length, 1);

    const countParam = def.params[0];
    assert.equal(countParam.name, 'count');
    assert.ok(countParam.options.includes('forever'));
    assert.ok(countParam.options.includes('2'));
    assert.ok(countParam.options.includes('3'));
  });

  it('wait should have a seconds dropdown and no body', () => {
    const def = BLOCK_DEFS.wait;
    assert.equal(def.category, 'flow');
    assert.ok(!def.hasBody);
    assert.equal(def.params.length, 1);

    const secondsParam = def.params[0];
    assert.equal(secondsParam.name, 'seconds');
    assert.ok(secondsParam.options.includes('0.5'));
    assert.ok(secondsParam.options.includes('1'));
    assert.ok(secondsParam.options.includes('2'));
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_COLORS
// ---------------------------------------------------------------------------

describe('CATEGORY_COLORS', () => {
  it('should define colors for all three categories', () => {
    assert.ok('condition' in CATEGORY_COLORS);
    assert.ok('action' in CATEGORY_COLORS);
    assert.ok('flow' in CATEGORY_COLORS);
  });

  it('each color should be a valid hex string', () => {
    for (const [cat, hex] of Object.entries(CATEGORY_COLORS)) {
      assert.match(hex, /^#[0-9a-fA-F]{6}$/, `${cat} has invalid hex: ${hex}`);
    }
  });

  it('all three colors should be distinct', () => {
    const values = Object.values(CATEGORY_COLORS);
    const unique = new Set(values);
    assert.equal(unique.size, values.length);
  });
});
