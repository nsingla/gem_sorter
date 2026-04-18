/**
 * Tests for RoboticArm model (js/game/RoboticArm.js)
 *
 * RoboticArm is a 2-segment articulated arm (excavator-style) that uses
 * inverse kinematics to reach targets. States:
 *   idle -> reaching_gem -> picking -> retracting -> idle
 *   idle -> reaching_slot -> placing -> returning -> idle
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { RoboticArm } from '../js/game/RoboticArm.js';
import { Gem } from '../js/game/Gem.js';
import { Slot } from '../js/game/Slot.js';

function runUntilIdle(arm, maxSteps = 500) {
  for (let i = 0; i < maxSteps; i++) {
    if (arm.isIdle) return;
    arm.update(50);
  }
  throw new Error('Arm did not return to idle within maxSteps');
}

describe('RoboticArm — construction', () => {
  it('should start in idle state with no held gem', () => {
    const arm = new RoboticArm();
    assert.equal(arm.state, 'idle');
    assert.equal(arm.heldGem, null);
    assert.ok(arm.gripOpen);
    assert.ok(arm.isIdle);
  });
});

describe('RoboticArm.configure()', () => {
  it('should reset state and set pivot from canvas dimensions', () => {
    const arm = new RoboticArm();
    arm.state = 'picking';
    arm.heldGem = new Gem('red', 'circle');

    arm.configure(1000, 600);

    assert.equal(arm.pivotX, 500);
    assert.equal(arm.pivotY, 20);
    assert.equal(arm.state, 'idle');
    assert.equal(arm.heldGem, null);
    assert.ok(arm.gripOpen);
  });

  it('should scale arm lengths proportionally to canvas height', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);

    assert.equal(arm.boomLen, 500 * 0.48);
    assert.equal(arm.stickLen, 500 * 0.42);
  });
});

describe('RoboticArm.pickUp()', () => {
  it('should transition to reaching_gem and target the gem', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const gem = new Gem('red', 'circle');
    gem.x = 200;
    gem.y = 150;

    arm.pickUp(gem, () => {});

    assert.equal(arm.state, 'reaching_gem');
    assert.equal(arm.heldGem, gem);
    assert.equal(gem.state, 'targeted');
  });

  it('should call onComplete after the full pick cycle completes', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const gem = new Gem('red', 'circle');
    gem.x = arm.restX;
    gem.y = arm.restY;

    let completed = false;
    arm.pickUp(gem, () => { completed = true; });

    runUntilIdle(arm);

    assert.ok(completed, 'onComplete callback should have fired');
    assert.equal(gem.state, 'held');
    assert.ok(arm.isIdle);
  });

  it('should close the grip during picking', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const gem = new Gem('red', 'circle');
    gem.x = arm.handX;
    gem.y = arm.handY;

    arm.pickUp(gem, () => {});

    for (let i = 0; i < 200; i++) {
      arm.update(10);
      if (arm.state === 'picking') {
        assert.ok(!arm.gripOpen, 'grip should be closed while picking');
        return;
      }
    }
    assert.fail('never reached picking state');
  });
});

describe('RoboticArm.placeIn()', () => {
  it('should transition to reaching_slot', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 300, y: 375 });

    arm.placeIn(slot, () => {});

    assert.equal(arm.state, 'reaching_slot');
    assert.equal(arm.targetSlot, slot);
  });

  it('should place held gem into the slot and call onComplete', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const gem = new Gem('red', 'circle');
    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 300, y: 375 });

    arm.heldGem = gem;
    gem.state = 'held';

    let completed = false;
    arm.placeIn(slot, () => { completed = true; });

    runUntilIdle(arm);

    assert.ok(completed, 'onComplete should fire after placing');
    assert.equal(arm.heldGem, null);
    assert.equal(gem.state, 'in_slot');
    assert.equal(slot.contents.length, 1);
  });
});

describe('RoboticArm.update()', () => {
  it('should not change anything when idle', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const a1Before = arm.angle1;
    const a2Before = arm.angle2;

    arm.update(1000);

    assert.equal(arm.angle1, a1Before);
    assert.equal(arm.angle2, a2Before);
    assert.equal(arm.state, 'idle');
  });

  it('should track held gem position to the arm hand', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);
    const gem = new Gem('red', 'circle');
    gem.state = 'held';
    arm.heldGem = gem;

    arm.state = 'retracting';
    arm._setTarget(arm.restX, arm.restY);
    arm.angle1 = arm.targetA1;
    arm.angle2 = arm.targetA2;
    arm.update(0);

    assert.ok(Math.abs(gem.x - arm.handX) < 1, 'gem x should follow arm hand');
    assert.ok(Math.abs(gem.y - arm.handY) < 1, 'gem y should follow arm hand');
  });
});

describe('RoboticArm — full pick-and-place cycle', () => {
  it('should pick a gem and place it, returning to idle', () => {
    const arm = new RoboticArm();
    arm.configure(700, 500);

    const gem = new Gem('red', 'circle');
    gem.x = 245;
    gem.y = 95;

    const slot = new Slot({ id: 0, label: 'Red', acceptColor: 'red', x: 200, y: 375 });

    let pickDone = false;
    arm.pickUp(gem, () => { pickDone = true; });
    runUntilIdle(arm);
    assert.ok(pickDone);
    assert.equal(gem.state, 'held');

    let placeDone = false;
    arm.placeIn(slot, () => { placeDone = true; });
    runUntilIdle(arm);
    assert.ok(placeDone);
    assert.equal(gem.state, 'in_slot');
    assert.ok(arm.isIdle);
    assert.equal(arm.heldGem, null);
  });
});

describe('RoboticArm.isIdle', () => {
  it('should be true only when state is idle', () => {
    const arm = new RoboticArm();
    assert.ok(arm.isIdle);

    arm.state = 'reaching_gem';
    assert.ok(!arm.isIdle);

    arm.state = 'picking';
    assert.ok(!arm.isIdle);

    arm.state = 'retracting';
    assert.ok(!arm.isIdle);

    arm.state = 'idle';
    assert.ok(arm.isIdle);
  });
});
