/**
 * Tests for LevelManager (js/levels/LevelManager.js)
 *
 * LevelManager loads level configs, creates Slot instances with computed
 * positions, calculates star ratings, and tracks progression.
 *
 * Note: loadLevel() sets document.body.className for theming,
 * so we need the DOM shim.
 */
import '../tests/helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { LevelManager } from '../js/levels/LevelManager.js';
import { levels } from '../js/levels/levels.js';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('LevelManager — construction', () => {
  it('should start at level index 0 with no loaded level', () => {
    const lm = new LevelManager();
    assert.equal(lm.currentLevelIndex, 0);
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
        levels[i].slots.length,
        `Level ${i + 1} should have ${levels[i].slots.length} slots`,
      );
    }
  });

  it('should create slots with correct acceptance criteria from config', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(0, 800, 600); // Level 1: one red slot

    const slot = result.slots[0];
    assert.equal(slot.acceptColor, 'red');
    assert.equal(slot.acceptShape, null);
    assert.equal(slot.label, 'Red');
  });

  it('should generate level-specific options for the workspace', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(3, 800, 600); // Level 4: 4 colors, 4 slots

    assert.equal(result.levelOptions.slotLabels.length, 4);
    assert.equal(result.levelOptions.slotLabels[0].value, '1');
    assert.deepEqual(result.levelOptions.colors, ['red', 'blue', 'green', 'yellow']);
  });

  it('should position slots centered relative to conveyor span', () => {
    const lm = new LevelManager();
    const result = lm.loadLevel(1, 800, 600); // Level 2: 2 slots

    const [slot1, slot2] = result.slots;
    // slots should be positioned side-by-side
    assert.ok(slot2.x > slot1.x, 'second slot should be to the right of first');
    // gap between slots should be 20px
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
});

// ---------------------------------------------------------------------------
// getStars()
// ---------------------------------------------------------------------------

describe('LevelManager.getStars()', () => {
  it('should return 0 stars below the first threshold', () => {
    const lm = new LevelManager();
    lm.loadLevel(0, 800, 600); // thresholds: [3, 5, 7]

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
