/**
 * Tests for ProgramRunner (js/blocks/ProgramRunner.js)
 *
 * ProgramRunner is the core interpreter for the block-based program language.
 * It executes instructions in a step-by-step coroutine style:
 *   - IF conditions check the gem in the pickup zone
 *   - PICK/PLACE trigger arm actions
 *   - REPEAT pushes/pops a call stack frame
 *   - The program loops from the end back to instruction 0
 *
 * This is the most critical module to test thoroughly because bugs here
 * directly break the gameplay loop.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ProgramRunner } from '../js/blocks/ProgramRunner.js';
import { Gem } from '../js/game/Gem.js';
import { Slot } from '../js/game/Slot.js';

// ---------------------------------------------------------------------------
// Helpers — mock arm and conveyor with minimal interfaces
// ---------------------------------------------------------------------------

function makeMockArm(overrides = {}) {
  return {
    isIdle: true,
    heldGem: null,
    pickUp(gem, cb) {
      this.heldGem = gem;
      gem.state = 'held';
      if (cb) cb();
    },
    placeIn(slot, cb) {
      if (this.heldGem) {
        slot.addGem(this.heldGem);
        this.heldGem = null;
      }
      if (cb) cb();
    },
    ...overrides,
  };
}

function makeMockConveyor(gemInZone = null) {
  return {
    getGemInPickupZone: () => gemInZone,
  };
}

function makeRunner({ gem = null, slots = [], arm = null } = {}) {
  const runner = new ProgramRunner();
  runner.configure(
    makeMockConveyor(gem),
    arm || makeMockArm(),
    slots,
  );
  return runner;
}

// ---------------------------------------------------------------------------
// Construction and lifecycle
// ---------------------------------------------------------------------------

describe('ProgramRunner — lifecycle', () => {
  it('should start in non-running state', () => {
    const runner = new ProgramRunner();
    assert.ok(!runner.running);
    assert.deepEqual(runner.program, []);
    assert.equal(runner.pc, 0);
  });

  it('load() should set the program, reset pc, and start running', () => {
    const runner = makeRunner();
    const program = [{ type: 'pick_gem' }];
    runner.load(program);

    assert.deepEqual(runner.program, program);
    assert.equal(runner.pc, 0);
    assert.ok(runner.running);
  });

  it('stop() should set running to false', () => {
    const runner = makeRunner();
    runner.load([{ type: 'pick_gem' }]);
    runner.stop();
    assert.ok(!runner.running);
  });

  it('reset() should clear everything', () => {
    const runner = makeRunner();
    runner.load([{ type: 'pick_gem' }]);
    runner.reset();

    assert.deepEqual(runner.program, []);
    assert.equal(runner.pc, 0);
    assert.deepEqual(runner.callStack, []);
    assert.ok(!runner.running);
  });
});

// ---------------------------------------------------------------------------
// step() — basic control flow
// ---------------------------------------------------------------------------

describe('ProgramRunner.step() — basic', () => {
  it('should do nothing when not running', () => {
    const runner = makeRunner();
    runner.step(); // should not throw
    assert.equal(runner.pc, 0);
  });

  it('should do nothing when program is empty', () => {
    const runner = makeRunner();
    runner.running = true;
    runner.step();
    assert.equal(runner.pc, 0);
  });

  it('should do nothing when arm is not idle', () => {
    const arm = makeMockArm({ isIdle: false });
    const runner = makeRunner({ arm });
    runner.load([{ type: 'pick_gem' }]);

    runner.step();
    assert.equal(runner.pc, 0, 'pc should not advance when arm is busy');
  });
});

// ---------------------------------------------------------------------------
// pick_gem instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — pick_gem', () => {
  it('should pick the gem in the zone and advance pc', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });
    runner.load([{ type: 'pick_gem' }]);

    runner.step();

    assert.equal(gem.state, 'held');
    assert.equal(runner.pc, 1);
  });

  it('should do nothing when no gem is in the pickup zone', () => {
    const runner = makeRunner({ gem: null });
    runner.load([{ type: 'pick_gem' }]);

    runner.step();

    assert.equal(runner.pc, 0, 'pc should NOT advance when no gem available');
  });
});

// ---------------------------------------------------------------------------
// place_in_slot instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — place_in_slot', () => {
  it('should place held gem into the specified slot', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'held';
    const arm = makeMockArm();
    arm.heldGem = gem;

    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const runner = makeRunner({ slots: [slot], arm });

    runner.load([{ type: 'place_in_slot', slot: '1' }]); // slot "1" = index 0
    runner.step();

    assert.equal(slot.contents.length, 1);
    assert.equal(slot.contents[0], gem);
    assert.equal(runner.pc, 1);
  });

  it('should skip place when arm holds no gem and wrap program back to 0', () => {
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const runner = makeRunner({ slots: [slot] });

    runner.load([{ type: 'place_in_slot', slot: '1' }]);
    runner.step();

    // place_in_slot with no held gem: pc++ (to 1), then while loop continues,
    // pc >= program.length wraps to 0, then returns.
    assert.equal(runner.pc, 0, 'should wrap back to start after skipping');
    assert.equal(slot.contents.length, 0, 'slot should remain empty');
  });

  it('should skip when slot index is invalid and wrap program', () => {
    const arm = makeMockArm();
    arm.heldGem = new Gem('red', 'circle');
    const runner = makeRunner({ slots: [], arm });

    runner.load([{ type: 'place_in_slot', slot: '99' }]);
    runner.step();

    // Same wrapping: pc goes 0->1->0 because the while loop continues
    assert.equal(runner.pc, 0, 'should wrap after skipping invalid slot');
  });

  it('should fire onCorrectSort callback when gem matches slot', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'held';
    const arm = makeMockArm();
    arm.heldGem = gem;

    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const runner = makeRunner({ slots: [slot], arm });

    let correctGem = null;
    let correctSlot = null;
    runner.onCorrectSort = (g, s) => { correctGem = g; correctSlot = s; };

    runner.load([{ type: 'place_in_slot', slot: '1' }]);
    runner.step();

    assert.equal(correctGem, gem);
    assert.equal(correctSlot, slot);
  });

  it('should fire onIncorrectSort callback when gem does not match slot', () => {
    const gem = new Gem('blue', 'circle');
    gem.state = 'held';
    const arm = makeMockArm();
    arm.heldGem = gem;

    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const runner = makeRunner({ slots: [slot], arm });

    let incorrectGem = null;
    runner.onIncorrectSort = (g, s) => { incorrectGem = g; };

    runner.load([{ type: 'place_in_slot', slot: '1' }]);
    runner.step();

    assert.equal(incorrectGem, gem);
  });
});

// ---------------------------------------------------------------------------
// if_color instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — if_color', () => {
  it('should enter body when gem color matches', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_color', color: 'red', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();

    // After stepping through if_color (match) + pick_gem
    assert.equal(gem.state, 'held', 'should have picked the gem via the body');
  });

  it('should skip body when gem color does not match', () => {
    const gem = new Gem('blue', 'diamond');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_color', color: 'red', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
      // pc jumps to 2 (bodyEnd), which resets to 0
    ]);

    runner.step();

    assert.equal(gem.state, 'on_belt', 'should NOT have picked the gem');
  });

  it('should wait (not advance) when no gem is in the pickup zone', () => {
    const runner = makeRunner({ gem: null });

    runner.load([
      { type: 'if_color', color: 'red', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(runner.pc, 0, 'pc should stay at 0 waiting for a gem');
  });
});

// ---------------------------------------------------------------------------
// if_shape instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — if_shape', () => {
  it('should enter body when gem shape matches', () => {
    const gem = new Gem('red', 'diamond');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_shape', shape: 'diamond', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(gem.state, 'held');
  });

  it('should skip body when gem shape does not match', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_shape', shape: 'diamond', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(gem.state, 'on_belt');
  });
});

// ---------------------------------------------------------------------------
// if_color_and_shape instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — if_color_and_shape', () => {
  it('should enter body only when BOTH color and shape match', () => {
    const gem = new Gem('red', 'star');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_color_and_shape', color: 'red', shape: 'star', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(gem.state, 'held');
  });

  it('should skip when color matches but shape does not', () => {
    const gem = new Gem('red', 'circle');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_color_and_shape', color: 'red', shape: 'star', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(gem.state, 'on_belt');
  });

  it('should skip when shape matches but color does not', () => {
    const gem = new Gem('blue', 'star');
    gem.state = 'on_belt';
    const runner = makeRunner({ gem });

    runner.load([
      { type: 'if_color_and_shape', color: 'red', shape: 'star', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    runner.step();
    assert.equal(gem.state, 'on_belt');
  });
});

// ---------------------------------------------------------------------------
// repeat instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — repeat', () => {
  it('should repeat body N times for a counted repeat before exiting', () => {
    let pickCount = 0;

    const arm = makeMockArm();
    const runner = new ProgramRunner();
    runner.configure(
      {
        getGemInPickupZone: () => {
          const g = new Gem('red', 'circle');
          g.state = 'on_belt';
          pickCount++;
          return g;
        },
      },
      arm,
      [],
    );

    // Program: REPEAT 3 { PICK }
    // Instruction layout: [0: repeat, 1: pick_gem]
    runner.load([
      { type: 'repeat', count: '3', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    // Trace:
    // Step 1: repeat pushes frame(remaining=3), pc=1. pick_gem: pc=2, returns. (1 pick)
    // Step 2: handleRepeatEnds: pc=2>=bodyEnd=2, remaining=3>1, remaining-- -> 2, pc=1. pick. (2 picks)
    // Step 3: handleRepeatEnds: remaining=2>1, remaining-- -> 1, pc=1. pick. (3 picks)
    // Step 4: handleRepeatEnds: remaining=1, not >1, pop. pc=2>=program.length, wrap to 0.
    //         repeat pushes new frame(remaining=3), pc=1. pick. (4 picks — second cycle starts)

    // Step 3 times to complete exactly 3 iterations of the repeat body
    runner.step(); // iteration 1: picks gem
    runner.step(); // iteration 2: picks gem
    runner.step(); // iteration 3: picks gem

    assert.equal(pickCount, 3, 'should have picked exactly 3 gems in 3 steps');

    // Step 4: repeat frame pops (remaining exhausted), pc wraps to 0, returns
    // (no pick on this step — just the repeat exit + program wrap)
    runner.step();
    assert.equal(pickCount, 3, 'no pick on the step that pops the repeat frame');

    // Step 5: new repeat cycle begins — pushes new frame, picks gem
    runner.step();
    assert.equal(pickCount, 4, 'program wraps and starts a new repeat cycle');
  });

  it('should handle repeat forever by looping indefinitely', () => {
    let pickCount = 0;

    const arm = makeMockArm();
    const runner = new ProgramRunner();
    runner.configure(
      {
        getGemInPickupZone: () => {
          const g = new Gem('red', 'circle');
          g.state = 'on_belt';
          pickCount++;
          return g;
        },
      },
      arm,
      [],
    );

    runner.load([
      { type: 'repeat', count: 'forever', bodyStart: 1, bodyEnd: 2 },
      { type: 'pick_gem' },
    ]);

    // Step many times
    for (let i = 0; i < 20; i++) {
      runner.step();
    }

    assert.ok(pickCount > 10, 'forever repeat should keep executing');
  });
});

// ---------------------------------------------------------------------------
// wait instruction
// ---------------------------------------------------------------------------

describe('ProgramRunner — wait', () => {
  it('should advance pc and return (yielding one step)', () => {
    const runner = makeRunner();
    runner.load([
      { type: 'wait', seconds: '1' },
      { type: 'pick_gem' },
    ]);

    runner.step(); // processes wait
    assert.equal(runner.pc, 1, 'should advance past wait');
  });
});

// ---------------------------------------------------------------------------
// Program wrapping (loop back to start)
// ---------------------------------------------------------------------------

describe('ProgramRunner — program loop', () => {
  it('should wrap pc back to 0 when reaching end of program', () => {
    const runner = makeRunner();
    runner.load([
      { type: 'wait', seconds: '1' },
    ]);

    runner.step(); // pc -> 1
    runner.step(); // pc >= program.length, wraps to 0

    assert.equal(runner.pc, 0);
  });
});

// ---------------------------------------------------------------------------
// Safety valve (infinite loop protection)
// ---------------------------------------------------------------------------

describe('ProgramRunner — infinite loop protection', () => {
  it('should not hang on deeply nested conditions with no gem', () => {
    const runner = makeRunner({ gem: null });

    // A program that would infinite-loop without the safety counter:
    // IF red -> (no gem, returns) — this actually returns early, safe.
    // But let's make sure the safety limit works for pathological cases.
    runner.load([
      { type: 'if_color', color: 'red', bodyStart: 1, bodyEnd: 1 },
    ]);

    // Should return without hanging
    runner.step();
    // If we get here, the safety valve worked
    assert.ok(true);
  });
});

// ---------------------------------------------------------------------------
// Complex multi-instruction programs
// ---------------------------------------------------------------------------

describe('ProgramRunner — complex programs', () => {
  it('should sort red to slot 1, blue to slot 2 inside a repeat', () => {
    // This tests the exact pattern a kid would build for Level 2:
    //   REPEAT forever
    //     IF red
    //       PICK
    //       PLACE in 1
    //     IF blue
    //       PICK
    //       PLACE in 2

    const redSlot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 0, y: 0 });
    const blueSlot = new Slot({ id: 1, label: 'Blue', acceptColor: 'blue', x: 100, y: 0 });

    const redGem = new Gem('red', 'circle');
    redGem.state = 'on_belt';

    // Conveyor returns the red gem initially, then null after it's picked
    let currentGem = redGem;
    const arm = makeMockArm();

    // Override pickUp to remove gem from zone after picking
    const originalPickUp = arm.pickUp.bind(arm);
    arm.pickUp = function(gem, cb) {
      currentGem = null; // gem leaves the belt
      originalPickUp(gem, cb);
    };

    const runner = new ProgramRunner();
    runner.configure({ getGemInPickupZone: () => currentGem }, arm, [redSlot, blueSlot]);

    runner.load([
      // 0: REPEAT forever {bodyStart: 1, bodyEnd: 7}
      { type: 'repeat', count: 'forever', bodyStart: 1, bodyEnd: 7 },
      // 1: IF red {bodyStart: 2, bodyEnd: 4}
      { type: 'if_color', color: 'red', bodyStart: 2, bodyEnd: 4 },
      // 2: PICK
      { type: 'pick_gem' },
      // 3: PLACE in 1
      { type: 'place_in_slot', slot: '1' },
      // 4: IF blue {bodyStart: 5, bodyEnd: 7}
      { type: 'if_color', color: 'blue', bodyStart: 5, bodyEnd: 7 },
      // 5: PICK
      { type: 'pick_gem' },
      // 6: PLACE in 2
      { type: 'place_in_slot', slot: '2' },
    ]);

    // Step 1: IF red -> matches, enters body (pc moves to 2)
    // Step 1 continues: PICK -> picks redGem, returns
    runner.step();

    // Step 2: PLACE in slot 1 -> places gem, arm.heldGem = null
    runner.step();

    assert.equal(redSlot.contents.length, 1, 'red gem should be in red slot');
    assert.equal(redSlot.contents[0], redGem);
    assert.equal(blueSlot.contents.length, 0, 'blue slot should be empty');
  });

  it('should handle nested if + repeat correctly', () => {
    // REPEAT 2
    //   IF red
    //     PICK

    const gems = [];
    let gemIndex = 0;
    const gemSequence = [
      (() => { const g = new Gem('red', 'circle'); g.state = 'on_belt'; return g; })(),
      (() => { const g = new Gem('red', 'circle'); g.state = 'on_belt'; return g; })(),
      (() => { const g = new Gem('blue', 'circle'); g.state = 'on_belt'; return g; })(),
    ];

    const arm = makeMockArm();
    const runner = new ProgramRunner();
    runner.configure(
      { getGemInPickupZone: () => gemSequence[gemIndex] || null },
      arm,
      [],
    );

    runner.load([
      // 0: REPEAT 2 {bodyStart: 1, bodyEnd: 3}
      { type: 'repeat', count: '2', bodyStart: 1, bodyEnd: 3 },
      // 1: IF red {bodyStart: 2, bodyEnd: 3}
      { type: 'if_color', color: 'red', bodyStart: 2, bodyEnd: 3 },
      // 2: PICK
      { type: 'pick_gem' },
    ]);

    // First iteration: red gem, should pick
    runner.step();
    assert.equal(gemSequence[0].state, 'held', 'first red gem should be picked');

    // Advance to next gem for next iteration
    gemIndex = 1;
    arm.heldGem = null; // arm finished placing

    runner.step();
    assert.equal(gemSequence[1].state, 'held', 'second red gem should be picked');
  });
});
