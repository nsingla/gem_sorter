/**
 * Tests for GameEngine (js/engine/GameEngine.js)
 *
 * GameEngine is the state machine driving the game loop.
 * We test the state transitions and win/lose condition checking
 * by injecting mock components (no canvas rendering needed).
 *
 * States: idle -> running -> won | lost
 */
import '../tests/helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../js/engine/GameEngine.js';
import { Slot } from '../js/game/Slot.js';
import { Gem } from '../js/game/Gem.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCanvas() {
  return {
    width: 800,
    height: 600,
    getContext: () => ({}),
    parentElement: { clientWidth: 800, clientHeight: 600 },
  };
}

function makeMockRenderer() {
  return {
    draw() {},
    updateDimensions() {},
  };
}

function makeMockConveyor(overrides = {}) {
  return {
    gems: [],
    missedCount: 0,
    spawnedCount: 0,
    maxGems: 10,
    activeGemCount: 0,
    beltOffset: 0,
    isFinished: false,
    update() {},
    ...overrides,
  };
}

function makeMockArm(overrides = {}) {
  return {
    isIdle: true,
    state: 'idle',
    update() {},
    ...overrides,
  };
}

function makeMockProgramRunner() {
  return {
    step() {},
  };
}

function makeMockLevelManager(level = null) {
  return {
    currentLevel: level || {
      winCondition: { type: 'sort_count', count: 3 },
      loseCondition: { type: 'miss_count', count: 5 },
    },
  };
}

function makeEngine({
  conveyor = makeMockConveyor(),
  arm = makeMockArm(),
  renderer = makeMockRenderer(),
  programRunner = makeMockProgramRunner(),
  levelManager = makeMockLevelManager(),
  slots = [],
} = {}) {
  const engine = new GameEngine(makeMockCanvas());
  engine.setComponents({ conveyor, arm, renderer, programRunner, levelManager });
  engine.slots = slots;
  return engine;
}

// ---------------------------------------------------------------------------
// Construction and state
// ---------------------------------------------------------------------------

describe('GameEngine — construction', () => {
  it('should start in idle state', () => {
    const engine = makeEngine();
    assert.equal(engine.state, 'idle');
  });

  it('should have zero correctCount initially', () => {
    const engine = makeEngine();
    assert.equal(engine.correctCount, 0);
  });
});

// ---------------------------------------------------------------------------
// start() and stop()
// ---------------------------------------------------------------------------

describe('GameEngine — start/stop', () => {
  it('start() should set state to running and reset correctCount', () => {
    const engine = makeEngine();
    engine.correctCount = 5;

    const stateChanges = [];
    engine.onStateChange = (s) => stateChanges.push(s);

    engine.start();

    assert.equal(engine.state, 'running');
    assert.equal(engine.correctCount, 0);
    assert.ok(stateChanges.includes('running'));

    // Clean up: stop the animation loop to prevent hanging
    engine.stop();
  });

  it('stop() should set state to idle', () => {
    const engine = makeEngine();
    engine.state = 'running';

    const stateChanges = [];
    engine.onStateChange = (s) => stateChanges.push(s);

    engine.stop();

    assert.equal(engine.state, 'idle');
    assert.deepEqual(stateChanges, ['idle']);
  });
});

// ---------------------------------------------------------------------------
// _checkEndConditions() — win condition
// ---------------------------------------------------------------------------

describe('GameEngine — win condition', () => {
  it('should transition to won when all gems processed and correctCount meets threshold', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    for (let i = 0; i < 3; i++) {
      slot.addGem(new Gem('red', 'circle'));
    }

    const engine = makeEngine({
      slots: [slot],
      conveyor: makeMockConveyor({ isFinished: true }),
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 3 },
        loseCondition: { type: 'miss_count', count: 5 },
      }),
    });

    engine.state = 'running';
    const stateChanges = [];
    engine.onStateChange = (s) => stateChanges.push(s);

    engine._checkEndConditions();

    assert.equal(engine.state, 'won');
    assert.deepEqual(stateChanges, ['won']);
  });

  it('should count only correctly-sorted gems (not misplaced ones)', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    // 2 correct + 1 wrong
    slot.addGem(new Gem('red', 'circle'));
    slot.addGem(new Gem('red', 'diamond'));
    slot.addGem(new Gem('blue', 'circle')); // wrong color

    const engine = makeEngine({
      slots: [slot],
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 3 },
        loseCondition: { type: 'miss_count', count: 10 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    // 2 correct, not enough to win
    assert.equal(engine.state, 'running');
    assert.equal(engine.correctCount, 2);
  });

  it('should count correct gems across multiple slots and win when finished', () => {
    const slot1 = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const slot2 = new Slot({ id: 1, label: 'Blue', acceptColor: 'blue', x: 100, y: 0 });

    slot1.addGem(new Gem('red', 'circle'));
    slot2.addGem(new Gem('blue', 'diamond'));
    slot2.addGem(new Gem('blue', 'star'));

    const engine = makeEngine({
      slots: [slot1, slot2],
      conveyor: makeMockConveyor({ isFinished: true }),
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 3 },
        loseCondition: { type: 'miss_count', count: 10 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    assert.equal(engine.state, 'won');
    assert.equal(engine.correctCount, 3);
  });
});

// ---------------------------------------------------------------------------
// _checkEndConditions() — lose condition
// ---------------------------------------------------------------------------

describe('GameEngine — lose condition', () => {
  it('should transition to lost when sortable missed gems reach loseCondition.count', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const fallenGems = Array.from({ length: 5 }, () => {
      const g = new Gem('red', 'circle');
      g.state = 'fallen';
      return g;
    });
    const conveyor = makeMockConveyor({ gems: fallenGems });
    const engine = makeEngine({
      conveyor,
      slots: [slot],
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 10 },
        loseCondition: { type: 'miss_count', count: 5 },
      }),
    });

    engine.state = 'running';
    const stateChanges = [];
    engine.onStateChange = (s) => stateChanges.push(s);

    engine._checkEndConditions();

    assert.equal(engine.state, 'lost');
    assert.deepEqual(stateChanges, ['lost']);
  });

  it('should count misplaced gems toward the missed total', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    // Put 3 wrong gems in the slot
    slot.addGem(new Gem('blue', 'circle'));
    slot.addGem(new Gem('green', 'diamond'));
    slot.addGem(new Gem('yellow', 'star'));

    // 2 red gems fell off (match the slot, so they count as missed)
    const fallenGems = Array.from({ length: 2 }, () => {
      const g = new Gem('red', 'circle');
      g.state = 'fallen';
      return g;
    });
    const conveyor = makeMockConveyor({ gems: fallenGems });

    const engine = makeEngine({
      conveyor,
      slots: [slot],
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 10 },
        loseCondition: { type: 'miss_count', count: 5 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    // 2 missed + 3 incorrect = 5 >= 5 lose threshold
    assert.equal(engine.state, 'lost');
  });

  it('should NOT count distractor gems falling off as missed', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    // 5 blue gems fall off — none match the red slot
    const fallenGems = Array.from({ length: 5 }, () => {
      const g = new Gem('blue', 'circle');
      g.state = 'fallen';
      return g;
    });
    const conveyor = makeMockConveyor({ gems: fallenGems });

    const engine = makeEngine({
      conveyor,
      slots: [slot],
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 10 },
        loseCondition: { type: 'miss_count', count: 5 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    assert.equal(engine.state, 'running', 'distractors should not trigger lose');
  });
});

// ---------------------------------------------------------------------------
// _checkEndConditions() — conveyor finished
// ---------------------------------------------------------------------------

describe('GameEngine — conveyor finished', () => {
  it('should resolve as lost when conveyor is finished with insufficient correct gems', () => {
    const conveyor = makeMockConveyor({ isFinished: true });
    const arm = makeMockArm({ isIdle: true });

    const engine = makeEngine({
      conveyor,
      arm,
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 5 },
        loseCondition: { type: 'miss_count', count: 99 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    assert.equal(engine.state, 'lost', 'should lose when all gems done and not enough correct');
  });

  it('should not end game if arm is still busy when conveyor finishes', () => {
    const conveyor = makeMockConveyor({ isFinished: true });
    const arm = makeMockArm({ isIdle: false });

    const engine = makeEngine({
      conveyor,
      arm,
      levelManager: makeMockLevelManager({
        winCondition: { type: 'sort_count', count: 5 },
        loseCondition: { type: 'miss_count', count: 99 },
      }),
    });

    engine.state = 'running';
    engine._checkEndConditions();

    assert.equal(engine.state, 'running', 'should stay running while arm is busy');
  });
});

// ---------------------------------------------------------------------------
// State change callback
// ---------------------------------------------------------------------------

describe('GameEngine — onStateChange callback', () => {
  it('should fire onStateChange when state transitions', () => {
    const engine = makeEngine();
    const transitions = [];
    engine.onStateChange = (s) => transitions.push(s);

    engine.start();   // idle -> running
    engine.stop();    // running -> idle (also cancels animation loop)

    assert.deepEqual(transitions, ['running', 'idle']);
  });

  it('should not throw if no onStateChange callback is set', () => {
    const engine = makeEngine();
    engine.onStateChange = null;

    assert.doesNotThrow(() => {
      engine.start();
      engine.stop(); // clean up animation loop
    });
  });
});

// ---------------------------------------------------------------------------
// _update() integration
// ---------------------------------------------------------------------------

describe('GameEngine._update()', () => {
  it('should call conveyor.update, programRunner.step, and arm.update', () => {
    let conveyorUpdated = false;
    let programStepped = false;
    let armUpdated = false;

    const engine = makeEngine({
      conveyor: makeMockConveyor({ update: () => { conveyorUpdated = true; } }),
      arm: makeMockArm({
        isIdle: true,
        update: () => { armUpdated = true; },
      }),
      programRunner: { step: () => { programStepped = true; } },
    });

    engine._update(16);

    assert.ok(conveyorUpdated, 'conveyor.update should be called');
    assert.ok(programStepped, 'programRunner.step should be called');
    assert.ok(armUpdated, 'arm.update should be called');
  });

  it('should not step programRunner when arm is busy', () => {
    let programStepped = false;

    const engine = makeEngine({
      arm: makeMockArm({ isIdle: false, update: () => {} }),
      programRunner: { step: () => { programStepped = true; } },
      conveyor: makeMockConveyor({ update: () => {} }),
    });

    engine._update(16);

    assert.ok(!programStepped, 'should not step program when arm is busy');
  });
});
