export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'idle';
    this.lastTime = 0;
    this.animFrameId = null;
    this.conveyor = null;
    this.arm = null;
    this.slots = [];
    this.renderer = null;
    this.programRunner = null;
    this.levelManager = null;
    this.onStateChange = null;
    this.onUpdate = null;
    this.correctCount = 0;
  }

  setComponents({ conveyor, arm, renderer, programRunner, levelManager }) {
    this.conveyor = conveyor;
    this.arm = arm;
    this.renderer = renderer;
    this.programRunner = programRunner;
    this.levelManager = levelManager;
  }

  start() {
    this.state = 'running';
    this.correctCount = 0;
    this.lastTime = performance.now();
    if (this.onStateChange) this.onStateChange(this.state);
    this._loop(this.lastTime);
  }

  stop() {
    this.state = 'idle';
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onStateChange) this.onStateChange(this.state);
  }

  _loop(now) {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    if (this.state === 'running') {
      this._update(dt);
      this._checkEndConditions();
    }

    this.renderer.draw({
      state: this.state,
      conveyor: this.conveyor,
      arm: this.arm,
      slots: this.slots,
      dt,
    });

    this.animFrameId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.conveyor.update(dt);

    if (this.programRunner && this.arm.isIdle) {
      this.programRunner.step();
    }

    this.arm.update(dt);

    if (this.onUpdate) this.onUpdate(dt);
  }

  _checkEndConditions() {
    const level = this.levelManager.currentLevel;
    if (!level) return;

    this.correctCount = this.slots.reduce((sum, slot) => {
      return sum + slot.contents.filter(g => slot.accepts(g)).length;
    }, 0);

    const incorrectCount = this.slots.reduce((sum, slot) => {
      return sum + slot.contents.filter(g => !slot.accepts(g)).length;
    }, 0);

    if (this.conveyor.missedCount + incorrectCount >= level.loseCondition.count) {
      this.state = 'lost';
      if (this.onStateChange) this.onStateChange(this.state);
      return;
    }

    if (this.conveyor.isFinished && this.arm.isIdle) {
      this.state = this.correctCount >= level.winCondition.count ? 'won' : 'lost';
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    this.canvas.width = wrapper.clientWidth;
    this.canvas.height = wrapper.clientHeight;
    if (this.renderer) this.renderer.updateDimensions(this.canvas.width, this.canvas.height);
  }
}
