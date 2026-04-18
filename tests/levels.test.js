/**
 * Tests for level configs (js/levels/levels.js)
 *
 * Validates that all 10 level definitions have the required fields,
 * sane values, and consistent structure. These are schema-style
 * validation tests that catch config typos and missing fields.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { levels } from '../js/levels/levels.js';
import { BLOCK_DEFS } from '../js/blocks/BlockDefinitions.js';

// ---------------------------------------------------------------------------
// Schema validation for every level
// ---------------------------------------------------------------------------

describe('Level configs — schema validation', () => {
  it('should have exactly 10 levels', () => {
    assert.equal(levels.length, 10);
  });

  it('each level should have all required fields', () => {
    const requiredFields = [
      'id', 'name', 'theme', 'description',
      'conveyorSpeed', 'gemSpawnInterval',
      'sortBy', 'numSlots', 'numDistractors', 'gemWeight', 'distractorWeight',
      'availableBlocks',
      'winCondition', 'loseCondition',
      'maxGems', 'starThresholds',
    ];

    for (const level of levels) {
      for (const field of requiredFields) {
        assert.ok(
          field in level,
          `Level ${level.id} "${level.name}" is missing field: ${field}`,
        );
      }
    }
  });

  it('level ids should be sequential 1-10', () => {
    for (let i = 0; i < levels.length; i++) {
      assert.equal(levels[i].id, i + 1, `Level at index ${i} should have id ${i + 1}`);
    }
  });

  it('sortBy should be a valid sort mode', () => {
    const validModes = ['color', 'shape', 'color_and_shape'];
    for (const level of levels) {
      assert.ok(
        validModes.includes(level.sortBy),
        `Level ${level.id}: invalid sortBy "${level.sortBy}"`,
      );
    }
  });

  it('numSlots should be between 1 and 5', () => {
    for (const level of levels) {
      assert.ok(level.numSlots >= 1 && level.numSlots <= 5,
        `Level ${level.id}: numSlots (${level.numSlots}) out of range`);
    }
  });

  it('numDistractors should be non-negative', () => {
    for (const level of levels) {
      assert.ok(level.numDistractors >= 0,
        `Level ${level.id}: numDistractors should be >= 0`);
    }
  });

  it('gemWeight should be positive', () => {
    for (const level of levels) {
      assert.ok(level.gemWeight > 0,
        `Level ${level.id}: gemWeight should be > 0`);
    }
  });
});

// ---------------------------------------------------------------------------
// Available blocks validation
// ---------------------------------------------------------------------------

describe('Level configs — available blocks', () => {
  it('each level should have at least one available block', () => {
    for (const level of levels) {
      assert.ok(
        level.availableBlocks.length >= 1,
        `Level ${level.id} has no available blocks`,
      );
    }
  });

  it('all referenced blocks should exist in BLOCK_DEFS', () => {
    for (const level of levels) {
      for (const blockType of level.availableBlocks) {
        assert.ok(
          blockType in BLOCK_DEFS,
          `Level ${level.id}: unknown block type "${blockType}"`,
        );
      }
    }
  });

  it('every level should include pick_gem and place_in_slot (required for gameplay)', () => {
    for (const level of levels) {
      assert.ok(
        level.availableBlocks.includes('pick_gem'),
        `Level ${level.id}: missing pick_gem block`,
      );
      assert.ok(
        level.availableBlocks.includes('place_in_slot'),
        `Level ${level.id}: missing place_in_slot block`,
      );
    }
  });

  it('every level should include at least one condition block', () => {
    const conditionBlocks = ['if_color', 'if_shape', 'if_color_and_shape'];
    for (const level of levels) {
      const hasCondition = level.availableBlocks.some(b => conditionBlocks.includes(b));
      assert.ok(
        hasCondition,
        `Level ${level.id}: no condition block available`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Win/lose conditions
// ---------------------------------------------------------------------------

describe('Level configs — win/lose conditions', () => {
  it('winCondition should have type sort_count and a positive count', () => {
    for (const level of levels) {
      assert.equal(level.winCondition.type, 'sort_count',
        `Level ${level.id}: winCondition type should be sort_count`);
      assert.ok(level.winCondition.count > 0,
        `Level ${level.id}: winCondition count should be > 0`);
    }
  });

  it('loseCondition should have type miss_count and a positive count', () => {
    for (const level of levels) {
      assert.equal(level.loseCondition.type, 'miss_count',
        `Level ${level.id}: loseCondition type should be miss_count`);
      assert.ok(level.loseCondition.count > 0,
        `Level ${level.id}: loseCondition count should be > 0`);
    }
  });

  it('winCondition.count should not exceed maxGems', () => {
    for (const level of levels) {
      assert.ok(
        level.winCondition.count <= level.maxGems,
        `Level ${level.id}: win requires ${level.winCondition.count} but only ${level.maxGems} gems spawn`,
      );
    }
  });

  it('win + lose thresholds should make the level theoretically winnable', () => {
    for (const level of levels) {
      const maxSortable = level.maxGems - level.loseCondition.count + 1;
      assert.ok(
        maxSortable >= level.winCondition.count,
        `Level ${level.id}: impossible — need ${level.winCondition.count} correct but can sort at most ${maxSortable}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Star thresholds
// ---------------------------------------------------------------------------

describe('Level configs — star thresholds', () => {
  it('each level should have exactly 3 star thresholds', () => {
    for (const level of levels) {
      assert.equal(
        level.starThresholds.length, 3,
        `Level ${level.id}: should have 3 star thresholds`,
      );
    }
  });

  it('star thresholds should be in ascending order', () => {
    for (const level of levels) {
      const [s1, s2, s3] = level.starThresholds;
      assert.ok(s1 < s2 && s2 < s3,
        `Level ${level.id}: thresholds [${s1}, ${s2}, ${s3}] should be strictly ascending`);
    }
  });

  it('1-star threshold should equal winCondition.count (win = at least 1 star)', () => {
    for (const level of levels) {
      assert.equal(
        level.starThresholds[0],
        level.winCondition.count,
        `Level ${level.id}: 1-star threshold (${level.starThresholds[0]}) should match winCondition.count (${level.winCondition.count})`,
      );
    }
  });

  it('3-star threshold should not exceed maxGems', () => {
    for (const level of levels) {
      assert.ok(
        level.starThresholds[2] <= level.maxGems,
        `Level ${level.id}: 3-star threshold (${level.starThresholds[2]}) exceeds maxGems (${level.maxGems})`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Difficulty progression
// ---------------------------------------------------------------------------

describe('Level configs — difficulty progression', () => {
  it('conveyor speed should generally increase across levels', () => {
    const firstSpeed = levels[0].conveyorSpeed;
    const lastSpeed = levels[levels.length - 1].conveyorSpeed;
    assert.ok(lastSpeed > firstSpeed,
      `Last level speed (${lastSpeed}) should be faster than first (${firstSpeed})`);
  });

  it('gem spawn interval should generally decrease across levels', () => {
    const firstInterval = levels[0].gemSpawnInterval;
    const lastInterval = levels[levels.length - 1].gemSpawnInterval;
    assert.ok(lastInterval < firstInterval,
      `Last level interval (${lastInterval}ms) should be shorter than first (${firstInterval}ms)`);
  });

  it('number of slots should generally increase across levels', () => {
    const firstSlots = levels[0].numSlots;
    const lastSlots = levels[levels.length - 1].numSlots;
    assert.ok(lastSlots >= firstSlots,
      `Last level should have at least as many slots as the first`);
  });
});

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

describe('Level configs — themes', () => {
  it('every level should have a non-empty theme string', () => {
    for (const level of levels) {
      assert.ok(
        typeof level.theme === 'string' && level.theme.length > 0,
        `Level ${level.id}: theme should be a non-empty string`,
      );
    }
  });

  it('all themes should be unique', () => {
    const themes = levels.map(l => l.theme);
    const unique = new Set(themes);
    assert.equal(unique.size, themes.length, 'each level should have a unique theme');
  });
});
