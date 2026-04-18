/**
 * Tests for Conveyor model (js/game/Conveyor.js)
 *
 * Conveyor manages the gem belt: spawning gems at intervals, moving them
 * rightward, detecting missed gems, and providing the pickup zone query.
 *
 * Key behaviors to verify:
 *   - configure() resets all state from a level config
 *   - update(dt) moves gems, spawns new ones, marks fallen gems as missed
 *   - getGemInPickupZone() returns the rightmost on_belt gem in zone
 *   - activeGemCount / isFinished computed properties
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Conveyor } from '../js/game/Conveyor.js';
import { Gem } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides = {}) {
  return {
    conveyorSpeed: 40,
    gemSpawnInterval: 3000,
    gemTypes: [
      { color: 'red', shape: 'circle', weight: 1 },
    ],
    maxGems: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Construction & configure
// ---------------------------------------------------------------------------

describe('Conveyor — construction', () => {
  it('should have sensible defaults before configure', () => {
    const c = new Conveyor();
    assert.deepEqual(c.gems, []);
    assert.equal(c.spawnedCount, 0);
    assert.equal(c.missedCount, 0);
  });
});

describe('Conveyor.configure()', () => {
  it('should reset all state from level config', () => {
    const c = new Conveyor();
    c.spawnedCount = 99;
    c.missedCount = 5;
    c.gems.push(new Gem('red', 'circle'));

    c.configure(makeConfig(), 800, 600);

    assert.equal(c.speed, 40);
    assert.equal(c.spawnInterval, 3000);
    assert.equal(c.maxGems, 5);
    assert.equal(c.spawnedCount, 0);
    assert.equal(c.missedCount, 0);
    assert.deepEqual(c.gems, []);
  });

  it('should set pickup and end positions based on canvas dimensions', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 1000, 800);
    assert.equal(c.endX, 1000 * 0.68);
    assert.equal(c.pickupX, 1000 * 0.35);
    assert.equal(c.y, 800 * 0.30);
  });

  it('should pre-load timeSinceLastSpawn so first gem spawns immediately', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ gemSpawnInterval: 2000 }), 800, 600);
    assert.equal(c.timeSinceLastSpawn, 2000);
  });
});

// ---------------------------------------------------------------------------
// spawnGem()
// ---------------------------------------------------------------------------

describe('Conveyor.spawnGem()', () => {
  it('should create a gem from the weighted type list and add it to gems array', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    c.spawnedCount = 0;
    const gem = c.spawnGem();

    assert.ok(gem instanceof Gem);
    assert.equal(gem.color, 'red');
    assert.equal(gem.shape, 'circle');
    assert.equal(c.gems.length, 1);
    assert.equal(c.spawnedCount, 1);
  });

  it('should place the new gem at startX', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const gem = c.spawnGem();
    assert.equal(gem.x, c.startX);
  });

  it('should select from multiple weighted gem types', () => {
    const c = new Conveyor();
    c.configure(makeConfig({
      gemTypes: [
        { color: 'red', shape: 'circle', weight: 1 },
        { color: 'blue', shape: 'diamond', weight: 1 },
      ],
    }), 800, 600);

    // Spawn enough times to likely hit both types
    const colors = new Set();
    for (let i = 0; i < 50; i++) {
      const gem = c.spawnGem();
      colors.add(gem.color);
    }
    assert.ok(colors.has('red') || colors.has('blue'),
      'should spawn at least one gem type');
  });
});

// ---------------------------------------------------------------------------
// update(dt) — movement and spawning
// ---------------------------------------------------------------------------

describe('Conveyor.update(dt)', () => {
  it('should move on_belt gems to the right', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ conveyorSpeed: 100 }), 800, 600);

    // Manually place a gem on the belt
    const gem = new Gem('red', 'circle');
    gem.x = 100;
    gem.state = 'on_belt';
    c.gems.push(gem);
    c.spawnedCount = c.maxGems; // prevent new spawns

    c.update(1000); // 1 second at speed=100 => move 100px

    assert.equal(gem.x, 200);
  });

  it('should mark gems as fallen and count missed when they pass endX', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ conveyorSpeed: 100 }), 800, 600);

    const gem = new Gem('red', 'circle');
    gem.x = c.endX - 10; // almost at the end
    gem.state = 'on_belt';
    c.gems.push(gem);
    c.spawnedCount = c.maxGems;

    c.update(1000); // moves 100px past endX

    assert.equal(gem.state, 'fallen');
    assert.equal(c.missedCount, 1);
  });

  it('should NOT move gems that are not on_belt (held, in_slot, etc.)', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ conveyorSpeed: 100 }), 800, 600);

    const gem = new Gem('red', 'circle');
    gem.x = 100;
    gem.state = 'held';
    c.gems.push(gem);
    c.spawnedCount = c.maxGems;

    c.update(1000);
    assert.equal(gem.x, 100, 'held gem should not move');
  });

  it('should spawn gems when timer exceeds spawnInterval', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ gemSpawnInterval: 1000, maxGems: 3 }), 800, 600);

    // First update: timer was pre-loaded to spawnInterval, so should spawn immediately
    c.update(0);
    assert.equal(c.spawnedCount, 1);
  });

  it('should stop spawning when spawnedCount reaches maxGems', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ gemSpawnInterval: 100, maxGems: 2 }), 800, 600);

    // Force spawn up to max
    c.update(0);   // spawns gem 1 (timer was pre-loaded)
    c.update(200); // spawns gem 2
    const countBefore = c.spawnedCount;
    c.update(200); // should NOT spawn gem 3
    assert.equal(c.spawnedCount, countBefore);
  });
});

// ---------------------------------------------------------------------------
// getGemInPickupZone()
// ---------------------------------------------------------------------------

describe('Conveyor.getGemInPickupZone()', () => {
  it('should return null when no gems are in the zone', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);
    assert.equal(c.getGemInPickupZone(), null);
  });

  it('should return a gem that is within the pickup zone', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const gem = new Gem('red', 'circle');
    gem.x = c.pickupX; // dead center of zone
    gem.state = 'on_belt';
    c.gems.push(gem);

    assert.equal(c.getGemInPickupZone(), gem);
  });

  it('should not return gems outside the pickup zone', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const gem = new Gem('red', 'circle');
    gem.x = c.pickupX + c.pickupZoneWidth; // well outside zone
    gem.state = 'on_belt';
    c.gems.push(gem);

    assert.equal(c.getGemInPickupZone(), null);
  });

  it('should only consider on_belt gems (not held, fallen, etc.)', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const gem = new Gem('red', 'circle');
    gem.x = c.pickupX;
    gem.state = 'held'; // not on_belt
    c.gems.push(gem);

    assert.equal(c.getGemInPickupZone(), null);
  });

  it('should return the rightmost gem when multiple are in zone', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const gem1 = new Gem('red', 'circle');
    gem1.x = c.pickupX - 10;
    gem1.state = 'on_belt';

    const gem2 = new Gem('blue', 'diamond');
    gem2.x = c.pickupX + 10;
    gem2.state = 'on_belt';

    c.gems.push(gem1, gem2);

    assert.equal(c.getGemInPickupZone(), gem2, 'should pick rightmost gem');
  });
});

// ---------------------------------------------------------------------------
// Computed properties
// ---------------------------------------------------------------------------

describe('Conveyor — computed properties', () => {
  it('activeGemCount should count on_belt and targeted gems', () => {
    const c = new Conveyor();
    c.configure(makeConfig(), 800, 600);

    const onBelt = new Gem('red', 'circle');
    onBelt.state = 'on_belt';

    const targeted = new Gem('blue', 'diamond');
    targeted.state = 'targeted';

    const fallen = new Gem('green', 'star');
    fallen.state = 'fallen';

    const held = new Gem('yellow', 'triangle');
    held.state = 'held';

    c.gems.push(onBelt, targeted, fallen, held);

    assert.equal(c.activeGemCount, 2);
  });

  it('isFinished should be true when all gems spawned and none active', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ maxGems: 2 }), 800, 600);
    c.spawnedCount = 2;

    // No active gems
    const fallen = new Gem('red', 'circle');
    fallen.state = 'fallen';
    c.gems.push(fallen);

    assert.ok(c.isFinished);
  });

  it('isFinished should be false when active gems remain', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ maxGems: 2 }), 800, 600);
    c.spawnedCount = 2;

    const active = new Gem('red', 'circle');
    active.state = 'on_belt';
    c.gems.push(active);

    assert.ok(!c.isFinished);
  });

  it('isFinished should be false when not all gems spawned yet', () => {
    const c = new Conveyor();
    c.configure(makeConfig({ maxGems: 5 }), 800, 600);
    c.spawnedCount = 3;

    assert.ok(!c.isFinished);
  });
});
