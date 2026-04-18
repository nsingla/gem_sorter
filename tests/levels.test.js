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
import { GEM_COLORS, GEM_SHAPES } from '../js/game/Gem.js';

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
      'conveyorSpeed', 'gemSpawnInterval', 'gemTypes',
      'slots', 'availableBlocks',
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
});

// ---------------------------------------------------------------------------
// Gem types validation
// ---------------------------------------------------------------------------

describe('Level configs — gem types', () => {
  it('each level should have at least one gem type', () => {
    for (const level of levels) {
      assert.ok(
        level.gemTypes.length >= 1,
        `Level ${level.id} has no gem types`,
      );
    }
  });

  it('gem type colors should be valid game colors', () => {
    const validColors = Object.keys(GEM_COLORS);
    for (const level of levels) {
      for (const gt of level.gemTypes) {
        assert.ok(
          validColors.includes(gt.color),
          `Level ${level.id}: invalid gem color "${gt.color}"`,
        );
      }
    }
  });

  it('gem type shapes should be valid game shapes', () => {
    for (const level of levels) {
      for (const gt of level.gemTypes) {
        assert.ok(
          GEM_SHAPES.includes(gt.shape),
          `Level ${level.id}: invalid gem shape "${gt.shape}"`,
        );
      }
    }
  });

  it('gem type weights should be positive numbers', () => {
    for (const level of levels) {
      for (const gt of level.gemTypes) {
        assert.ok(gt.weight > 0, `Level ${level.id}: weight must be > 0`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Slot configs validation
// ---------------------------------------------------------------------------

describe('Level configs — slots', () => {
  it('each level should have at least one slot', () => {
    for (const level of levels) {
      assert.ok(
        level.slots.length >= 1,
        `Level ${level.id} has no slots`,
      );
    }
  });

  it('slot ids should be sequential starting from 0', () => {
    for (const level of levels) {
      for (let i = 0; i < level.slots.length; i++) {
        assert.equal(
          level.slots[i].id, i,
          `Level ${level.id}, slot ${i}: id should be ${i}`,
        );
      }
    }
  });

  it('slot acceptColor (if set) should be a valid game color', () => {
    const validColors = Object.keys(GEM_COLORS);
    for (const level of levels) {
      for (const slot of level.slots) {
        if (slot.acceptColor) {
          assert.ok(
            validColors.includes(slot.acceptColor),
            `Level ${level.id}, slot "${slot.label}": invalid acceptColor "${slot.acceptColor}"`,
          );
        }
      }
    }
  });

  it('slot acceptShape (if set) should be a valid game shape', () => {
    for (const level of levels) {
      for (const slot of level.slots) {
        if (slot.acceptShape) {
          assert.ok(
            GEM_SHAPES.includes(slot.acceptShape),
            `Level ${level.id}, slot "${slot.label}": invalid acceptShape "${slot.acceptShape}"`,
          );
        }
      }
    }
  });

  it('each slot should have a non-empty label', () => {
    for (const level of levels) {
      for (const slot of level.slots) {
        assert.ok(
          slot.label && slot.label.trim().length > 0,
          `Level ${level.id}: slot ${slot.id} has empty label`,
        );
      }
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
      // With maxGems total, you can miss at most (loseCondition.count - 1)
      // So you have at least (maxGems - loseCondition.count + 1) gems to sort correctly
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
    const firstSlots = levels[0].slots.length;
    const lastSlots = levels[levels.length - 1].slots.length;
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
