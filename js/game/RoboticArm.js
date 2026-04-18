export class RoboticArm {
  constructor() {
    this.pivotX = 0;
    this.pivotY = 20;
    this.boomLen = 250;
    this.stickLen = 210;
    this.angle1 = Math.PI / 2;
    this.angle2 = 2.5;
    this.targetA1 = this.angle1;
    this.targetA2 = this.angle2;
    this.angularSpeed = 5;
    this.gripOpen = true;
    this.heldGem = null;
    this.state = 'idle';
    this.timer = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.restX = 0;
    this.restY = 0;
    this.targetSlot = null;
    this.onComplete = null;
  }

  configure(canvasWidth, canvasHeight) {
    this.pivotX = canvasWidth * 0.50;
    this.pivotY = 20;
    this.boomLen = canvasHeight * 0.48;
    this.stickLen = canvasHeight * 0.42;
    this.restX = this.pivotX + canvasWidth * 0.04;
    this.restY = this.pivotY + canvasHeight * 0.35;
    this._setTarget(this.restX, this.restY);
    this.angle1 = this.targetA1;
    this.angle2 = this.targetA2;
    this.state = 'idle';
    this.heldGem = null;
    this.gripOpen = true;
    this.targetSlot = null;
    this.onComplete = null;
  }

  get elbowX() { return this.pivotX + Math.cos(this.angle1) * this.boomLen; }
  get elbowY() { return this.pivotY + Math.sin(this.angle1) * this.boomLen; }
  get handX() { return this.elbowX + Math.cos(this.angle1 + this.angle2) * this.stickLen; }
  get handY() { return this.elbowY + Math.sin(this.angle1 + this.angle2) * this.stickLen; }

  pickUp(gem, onComplete) {
    gem.state = 'targeted';
    this.heldGem = gem;
    this.state = 'reaching_gem';
    this._setTarget(gem.x, gem.y);
    this.onComplete = onComplete;
  }

  placeIn(slot, onComplete) {
    this.targetSlot = slot;
    this.state = 'reaching_slot';
    this._setTarget(slot.x + slot.width / 2, slot.y + 5);
    this.onComplete = onComplete;
  }

  update(dt) {
    switch (this.state) {
      case 'idle':
        return;

      case 'reaching_gem':
        if (this._moveAngles(dt)) {
          this.state = 'picking';
          this.timer = 150;
          this.gripOpen = false;
        }
        break;

      case 'picking':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.heldGem) this.heldGem.state = 'held';
          this.state = 'retracting';
          this._setTarget(this.restX, this.restY);
        }
        break;

      case 'retracting':
        if (this._moveAngles(dt)) {
          this.state = 'idle';
          if (this.onComplete) this.onComplete();
        }
        break;

      case 'reaching_slot':
        if (this._moveAngles(dt)) {
          this.state = 'placing';
          this.timer = 150;
          this.gripOpen = true;
        }
        break;

      case 'placing':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.heldGem && this.targetSlot) {
            this.targetSlot.addGem(this.heldGem);
            this.heldGem = null;
          }
          this.state = 'returning';
          this._setTarget(this.restX, this.restY);
        }
        break;

      case 'returning':
        if (this._moveAngles(dt)) {
          this.state = 'idle';
          this.targetSlot = null;
          if (this.onComplete) this.onComplete();
        }
        break;
    }

    if (this.heldGem && this.heldGem.state === 'held') {
      this.heldGem.x = this.handX;
      this.heldGem.y = this.handY;
    }
  }

  _setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
    const ik = this._solveIK(x, y);
    this.targetA1 = ik.a1;
    this.targetA2 = ik.a2;
  }

  _solveIK(tx, ty) {
    const dx = tx - this.pivotX;
    const dy = ty - this.pivotY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    const L1 = this.boomLen;
    const L2 = this.stickLen;

    dist = Math.max(Math.abs(L1 - L2) + 5, Math.min(dist, L1 + L2 - 5));

    const cosA2 = (dist * dist - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const a2 = Math.acos(Math.max(-1, Math.min(1, cosA2)));

    const theta = Math.atan2(dy, dx);
    const k1 = L1 + L2 * Math.cos(a2);
    const k2 = L2 * Math.sin(a2);
    const a1 = theta - Math.atan2(k2, k1);

    return { a1, a2 };
  }

  _moveAngles(dt) {
    const speed = this.angularSpeed * dt / 1000;
    let done = true;

    const d1 = this.targetA1 - this.angle1;
    if (Math.abs(d1) > 0.02) {
      this.angle1 += Math.sign(d1) * Math.min(Math.abs(d1), speed);
      done = false;
    } else {
      this.angle1 = this.targetA1;
    }

    const d2 = this.targetA2 - this.angle2;
    if (Math.abs(d2) > 0.02) {
      this.angle2 += Math.sign(d2) * Math.min(Math.abs(d2), speed);
      done = false;
    } else {
      this.angle2 = this.targetA2;
    }

    return done;
  }

  get isIdle() {
    return this.state === 'idle';
  }
}
