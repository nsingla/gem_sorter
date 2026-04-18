export class ProgramRunner {
  constructor() {
    this.conveyor = null;
    this.arm = null;
    this.slots = [];
    this.program = [];
    this.pc = 0;
    this.callStack = [];
    this.running = false;
    this.onCorrectSort = null;
    this.onIncorrectSort = null;
  }

  configure(conveyor, arm, slots) {
    this.conveyor = conveyor;
    this.arm = arm;
    this.slots = slots;
  }

  load(program) {
    this.program = program;
    this.pc = 0;
    this.callStack = [];
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.program = [];
    this.pc = 0;
    this.callStack = [];
    this.running = false;
  }

  step() {
    if (!this.running || this.program.length === 0) return;
    if (!this.arm.isIdle) return;

    let safety = 200;

    while (safety-- > 0) {
      this._handleRepeatEnds();

      if (this.pc >= this.program.length) {
        this.pc = 0;
        return;
      }

      const instr = this.program[this.pc];

      switch (instr.type) {
        case 'if_color': {
          const gem = this.conveyor.getGemInPickupZone();
          if (!gem) return;
          this.pc = gem.color === instr.color ? instr.bodyStart : instr.bodyEnd;
          break;
        }

        case 'if_shape': {
          const gem = this.conveyor.getGemInPickupZone();
          if (!gem) return;
          this.pc = gem.shape === instr.shape ? instr.bodyStart : instr.bodyEnd;
          break;
        }

        case 'if_color_and_shape': {
          const gem = this.conveyor.getGemInPickupZone();
          if (!gem) return;
          this.pc = (gem.color === instr.color && gem.shape === instr.shape)
            ? instr.bodyStart : instr.bodyEnd;
          break;
        }

        case 'pick_gem': {
          const gem = this.conveyor.getGemInPickupZone();
          if (!gem) return;
          this.arm.pickUp(gem, () => {});
          this.pc++;
          return;
        }

        case 'place_in_slot': {
          if (instr.action === 'skip gem') {
            const gem = this.conveyor.getGemInPickupZone();
            if (!gem) return;
            gem.skipped = true;
            this.pc++;
            break;
          }

          const slotIdx = parseInt(instr.slot) - 1;
          const slot = this.slots[slotIdx];
          if (!slot || !this.arm.heldGem) { this.pc++; break; }

          const gem = this.arm.heldGem;
          this.arm.placeIn(slot, () => {
            if (gem && slot.accepts(gem)) {
              if (this.onCorrectSort) this.onCorrectSort(gem, slot);
            } else if (gem) {
              if (this.onIncorrectSort) this.onIncorrectSort(gem, slot);
            }
          });
          this.pc++;
          return;
        }

        case 'repeat': {
          const count = instr.count === 'forever' ? Infinity : parseInt(instr.count);
          this.callStack.push({
            bodyStart: instr.bodyStart,
            bodyEnd: instr.bodyEnd,
            remaining: count,
          });
          this.pc = instr.bodyStart;
          break;
        }

        case 'wait':
          this.pc++;
          return;

        default:
          this.pc++;
          break;
      }
    }
  }

  _handleRepeatEnds() {
    while (this.callStack.length > 0) {
      const frame = this.callStack[this.callStack.length - 1];
      if (this.pc < frame.bodyEnd) return;

      if (!isFinite(frame.remaining) || frame.remaining > 1) {
        if (isFinite(frame.remaining)) frame.remaining--;
        this.pc = frame.bodyStart;
        return;
      }

      this.callStack.pop();
    }
  }
}
