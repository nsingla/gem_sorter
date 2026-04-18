/**
 * Tests for LevelManager (js/levels/LevelManager.js)
 *
 * LevelManager loads level configs, dynamically generates gem types and
 * Slot instances with computed positions, calculates star ratings, and
 * tracks progression.
 *
 * Note: loadLevel() sets document.body.className for theming,
 * so we need the DOM shim.
 */
import '../tests/helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { LevelManager } from '../js/levels/LevelManager.js';
import { levels } from '../js/levels/levels.js';
import { GEM_COLORS, GEM_SHAPES } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('LevelManager — construction', () => {
  it('should start at level index -1 with no loaded level', () => {
    const lm = new LevelManager();
    assert.equal(lm.currentLevelIndex, -1);
    assert.equal(lm.currentLevel, null);
  });

  it('totalLevels should match the levels array length', () => {
    const lm = new LevelManager();
    assert.equal(lm.totalLevels, levels.length);
    assert.equal(lm.totalLevels, 10);
  });
});

// ---------------------------------------------------------------------------
// loadLevel()
// ---------------------------------------------------------------------------

describe('LevelManager.loadLevel()', () => {
  it('should load level 0 successfully', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(0, 800, 600);

    assert.ok(result !== null, 'should return a result object');
    assert.ok(result.level, 'result should contain the level config');
    assert.ok(Array.isArray(result.slots), 'result should contain slots array');
    assert.ok(result.levelOptions, 'result should contain levelOptions');
  });

  it('should set currentLevelIndex and currentLevel', () => {
    const lm = new LevelManager();
    lm.loadLevel(3, 800, 600);

    assert.equal(lm.currentLevelIndex, 3);
    assert.equal(lm.currentLevel.id, levels[3].id);
  });

  it('should return null for an out-of-bounds index', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(999, 800, 600);
    assert.equal(result, null);
  });

  it('should create the correct number of Slot objects', () => {
    const lm = new LevelManager();

    for (let i = 0; i < levels.length; i++) {
      const result = lm.loadLevel(i, 800, 600);
      assert.equal(
        result.slots.length,
        levels[i].numSlots,
        `Level ${i + 1} should have ${levels[i].numSlots} slots`,
      );
    }
  });

  it('should generate gem types with valid colors and shapes', () => {
    const lm = new LevelManager();
    const validColors = Object.keys(GEM_COLORS);

    for (let i = 0; i < levels.length; i++) {
      const result = lm.loadLevel(i, 800, 600);
      for (const gt of result.level.gemTypes) {
        assert.ok(validColors.includes(gt.color),
          `Level ${i + 1}: invalid gem color "${gt.color}"`);
        assert.ok(GEM_SHAPES.includes(gt.shape),
          `Level ${i + 1}: invalid gem shape "${gt.shape}"`);
        assert.ok(gt.weight > 0, `Level ${i + 1}: weight must be > 0`);
      }
    }
  });

  it('should generate slots with valid acceptance criteria', () => {
    const lm = new LevelManager();
    const validColors = Object.keys(GEM_COLORS);

    for (let i = 0; i < levels.length; i++) {
      const result = lm.loadLevel(i, 800, 600);
      for (const slot of result.slots) {
        if (slot.acceptColor) {
          assert.ok(validColors.includes(slot.acceptColor),
            `Level ${i + 1}: invalid slot acceptColor "${slot.acceptColor}"`);
        }
        if (slot.acceptShape) {
          assert.ok(GEM_SHAPES.includes(slot.acceptShape),
            `Level ${i + 1}: invalid slot acceptShape "${slot.acceptShape}"`);
        }
        assert.ok(slot.label && slot.label.trim().length > 0,
          `Level ${i + 1}: slot should have a non-empty label`);
      }
    }
  });

  it('color sort levels should generate slots with both color and shape', () => {
    const lm = new LevelManager();
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].sortBy !== 'color') continue;
      const result = lm.loadLevel(i, 800, 600);
      for (const slot of result.slots) {
        assert.ok(slot.acceptColor, `Level ${i + 1}: color-sort slot should have acceptColor`);
        assert.ok(slot.acceptShape, `Level ${i + 1}: color-sort slot should have acceptShape`);
      }
    }
  });

  it('shape sort levels should generate slots with shape but no color', () => {
    const lm = new LevelManager();
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].sortBy !== 'shape') continue;
      const result = lm.loadLevel(i, 800, 600);
      for (const slot of result.slots) {
        assert.equal(slot.acceptColor, null, `Level ${i + 1}: shape-sort slot should not have acceptColor`);
        assert.ok(slot.acceptShape, `Level ${i + 1}: shape-sort slot should have acceptShape`);
      }
    }
  });

  it('should generate level-specific options for the workspace', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(3, 800, 600); // Level 4: 4 color slots

    assert.equal(result.levelOptions.slotLabels.length, 4);
    assert.equal(result.levelOptions.slotLabels[0].value, '1');
    assert.ok(result.levelOptions.colors.length >= 4, 'should have at least 4 colors');
    assert.ok(result.levelOptions.shapes.length >= 4, 'should have at least 4 shapes');
  });

  it('should position slots centered relative to conveyor span', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(1, 800, 600); // Level 2: 2 slots

    const [slot1, slot2] = result.slots;
    assert.ok(slot2.x > slot1.x, 'second slot should be to the right of first');
    assert.equal(slot2.x - (slot1.x + slot1.width), 20);
  });

  it('should set slot Y position based on canvas height', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(0, 800, 600);

    assert.equal(result.slots[0].y, 600 * 0.75);
  });

  it('should set the document body theme class', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600);
    assert.equal(document.body.className, 'theme-forest');

    lm.loadLevel(1, 800, 600);
    assert.equal(document.body.className, 'theme-beach');
  });

  it('should preserve generated config when regenerate is false', () => {
    const lm = new LevelManager();
    const result1 = lm.loadLevel(0, 800, 600);
    const colors1 = result1.levelOptions.colors.slice();

    const result2 = lm.loadLevel(0, 800, 600, { regenerate: false });
    const colors2 = result2.levelOptions.colors.slice();

    assert.deepEqual(colors1, colors2, 'colors should be the same when not regenerating');
  });

  it('should generate fresh config when regenerate is true', () => {
    const lm = new LevelManager();
    const results = [];
    for (let i = 0; i < 20; i++) {
      const result = lm.loadLevel(0, 800, 600, { regenerate: true });
      results.push(result.levelOptions.colors.join(','));
    }
    const unique = new Set(results);
    assert.ok(unique.size > 1, 'at least some regenerated configs should differ');
  });
});

// ---------------------------------------------------------------------------
// getStars()
// ---------------------------------------------------------------------------

describe('LevelManager.getStars()', () => {
  it('should return 0 stars below the first threshold', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600); // thresholds: [3, 4, 5]

    assert.equal(lm.getStars(0), 0);
    assert.equal(lm.getStars(1), 0);
    assert.equal(lm.getStars(2), 0);
  });

  it('should return 1 star at the first threshold', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600); // thresholds: [3, 4, 5]

    assert.equal(lm.getStars(3), 1);
  });

  it('should return 2 stars at the second threshold', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600); // thresholds: [3, 4, 5]

    assert.equal(lm.getStars(4), 2);
  });

  it('should return 3 stars at the third threshold', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600); // thresholds: [3, 4, 5]

    assert.equal(lm.getStars(5), 3);
    assert.equal(lm.getStars(100), 3);
  });

  it('should work correctly for every level', () => {
    const lm = new LevelManager();
    for (let i = 0; i < levels.length; i++) {
      lm.loadLevel(i, 800, 600);
      const t = levels[i].starThresholds;

      assert.equal(lm.getStars(0), 0, `Level ${i + 1}: 0 correct = 0 stars`);
      assert.equal(lm.getStars(t[0]), 1, `Level ${i + 1}: ${t[0]} correct = 1 star`);
      assert.equal(lm.getStars(t[1]), 2, `Level ${i + 1}: ${t[1]} correct = 2 stars`);
      assert.equal(lm.getStars(t[2]), 3, `Level ${i + 1}: ${t[2]} correct = 3 stars`);
    }
  });
});

// ---------------------------------------------------------------------------
// hasNextLevel()
// ---------------------------------------------------------------------------

describe('LevelManager.hasNextLevel()', () => {
  it('should return true for all levels except the last', () => {
    const lm = new LevelManager();
    for (let i = 0; i < levels.length - 1; i++) {
      lm.loadLevel(i, 800, 600);
      assert.ok(lm.hasNextLevel(), `Level ${i + 1} should have a next level`);
    }
  });

  it('should return false for the last level', () => {
    const lm = new LevelManager();
    lm.loadLevel(levels.length - 1, 800, 600);
    assert.ok(!lm.hasNextLevel());
  });
});
