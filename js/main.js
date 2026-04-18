import { GameEngine } from './engine/GameEngine.js';
import { Renderer } from './engine/Renderer.js';
import { Conveyor } from './game/Conveyor.js';
import { RoboticArm } from './game/RoboticArm.js';
import { BlockWorkspace } from './blocks/BlockWorkspace.js';
import { ProgramRunner } from './blocks/ProgramRunner.js';
import { LevelManager } from './levels/LevelManager.js';
import { HUD } from './ui/HUD.js';
import { Modal } from './ui/Modal.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.engine = new GameEngine(this.canvas);
    this.renderer = new Renderer(this.canvas.getContext('2d'));
    this.conveyor = new Conveyor();
    this.arm = new RoboticArm();
    this.programRunner = new ProgramRunner();
    this.levelManager = new LevelManager();
    this.workspace = new BlockWorkspace(
      document.getElementById('palette'),
      document.getElementById('program-area'),
    );
    this.hud = new HUD();
    this.modal = new Modal();
    this._idleRafId = null;

    this.engine.setComponents({
      conveyor: this.conveyor,
      arm: this.arm,
      renderer: this.renderer,
      programRunner: this.programRunner,
      levelManager: this.levelManager,
    });

    this._setupButtons();
    this._setupResize();
    this._setupCallbacks();

    requestAnimationFrame(() => {
      this.engine.resize();
      this._showTutorial(() => this._loadLevel(0));
    });
  }

  _setupButtons() {
    document.getElementById('btn-run').addEventListener('click', () => this._onRun());
    document.getElementById('btn-stop').addEventListener('click', () => this._onStop());
    document.getElementById('btn-clear').addEventListener('click', () => this._onClear());
    document.getElementById('btn-help').addEventListener('click', () => this._showTutorial(() => {}));
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      this.engine.resize();
      if (this.engine.state === 'idle') {
        const result = this.levelManager.loadLevel(
          this.levelManager.currentLevelIndex,
          this.canvas.width,
          this.canvas.height,
        );
        if (result) {
          this.conveyor.configure(this.levelManager.currentLevel, this.canvas.width, this.canvas.height);
          this.arm.configure(this.canvas.width, this.canvas.height);
          this.engine.slots = result.slots;
          this.programRunner.configure(this.conveyor, this.arm, result.slots);
        }
      }
    });
  }

  _setupCallbacks() {
    this.engine.onStateChange = (state) => {
      const runBtn = document.getElementById('btn-run');
      const stopBtn = document.getElementById('btn-stop');

      if (state === 'running') {
        runBtn.disabled = true;
        stopBtn.disabled = false;
        this.workspace.setEnabled(false);
      } else {
        runBtn.disabled = false;
        stopBtn.disabled = true;
        this.workspace.setEnabled(true);
      }

      if (state === 'won') this._onWin();
      else if (state === 'lost') this._onLose();
    };

    this.engine.onUpdate = () => this._updateHUD();

    this.programRunner.onCorrectSort = (gem, slot) => {
      this.renderer.addParticles(slot.x + slot.width / 2, slot.y, gem.color, 12);
    };
  }

  _showTutorial(callback) {
    this.modal.show({
      title: 'How to Play',
      html:
        '<p>Program the robotic arm to sort gems into the correct bins!</p>' +
        '<ol class="tutorial-steps">' +
        '<li>Drag blocks from the <strong>TOOLBOX</strong> into <strong>YOUR PROGRAM</strong> area</li>' +
        '<li>Always start with a <strong>REPEAT</strong> block so the arm keeps sorting</li>' +
        '<li>Add <strong>IF</strong> blocks inside REPEAT to check each gem</li>' +
        '<li>Add <strong>PICK</strong> and <strong>PLACE</strong> inside IF to sort it</li>' +
        '<li>Click <strong>RUN</strong> and watch your program work!</li>' +
        '</ol>' +
        '<div class="tutorial-example">REPEAT Forever &rarr; IF Red &rarr; PICK &rarr; PLACE Slot 1</div>' +
        '<p style="opacity:0.6;font-size:13px;text-align:center">Without REPEAT, the arm only sorts one gem and stops!</p>',
      actions: [{ label: 'Got it!', className: 'btn-run', onClick: callback }],
    });
  }

  _loadLevel(index) {
    if (this._idleRafId) cancelAnimationFrame(this._idleRafId);

    this.engine.resize();

    const result = this.levelManager.loadLevel(index, this.canvas.width, this.canvas.height);
    if (!result) return;

    const { level, slots, levelOptions } = result;
    this.conveyor.configure(level, this.canvas.width, this.canvas.height);
    this.arm.configure(this.canvas.width, this.canvas.height);
    this.engine.slots = slots;
    this.programRunner.configure(this.conveyor, this.arm, slots);
    this.programRunner.reset();
    this.workspace.configure(level.availableBlocks, levelOptions);
    this.hud.setLevel(level);
    this.renderer.reloadTheme();

    this.engine.stop();
    this._startIdleRender();

    this.modal.show({
      title: `Level ${level.id}: ${level.name}`,
      html:
        `<p>${level.description}</p>` +
        (level.hint ? `<div class="tutorial-example">${level.hint}</div>` : ''),
      actions: [{ label: 'Start', className: 'btn-run', onClick: () => {} }],
    });
  }

  _startIdleRender() {
    let lastTime = performance.now();
    const render = (now) => {
      if (this.engine.state === 'running') return;
      const dt = now - lastTime;
      lastTime = now;
      this.conveyor.beltOffset = (this.conveyor.beltOffset + 10 * dt / 1000) % 20;
      this.renderer.draw({
        state: 'idle',
        conveyor: this.conveyor,
        arm: this.arm,
        slots: this.engine.slots,
        dt,
      });
      this._idleRafId = requestAnimationFrame(render);
    };
    this._idleRafId = requestAnimationFrame(render);
  }

  _onRun() {
    const program = this.workspace.getProgram();
    if (program.length === 0) {
      this.modal.show({
        title: 'No Program',
        html: '<p>Drag some blocks into the program area first!</p>',
        actions: [{ label: 'OK', className: 'btn-run', onClick: () => {} }],
      });
      return;
    }
    if (this._idleRafId) cancelAnimationFrame(this._idleRafId);
    this.programRunner.load(program);
    this.engine.start();
  }

  _onStop() {
    this.engine.stop();
    this.programRunner.stop();

    const result = this.levelManager.loadLevel(
      this.levelManager.currentLevelIndex,
      this.canvas.width,
      this.canvas.height,
    );
    if (!result) return;

    this.conveyor.configure(this.levelManager.currentLevel, this.canvas.width, this.canvas.height);
    this.arm.configure(this.canvas.width, this.canvas.height);
    this.engine.slots = result.slots;
    this.programRunner.configure(this.conveyor, this.arm, result.slots);
    this.hud.setLevel(this.levelManager.currentLevel);
    this._startIdleRender();
  }

  _onClear() {
    this.workspace.clear();
  }

  _onWin() {
    const correctCount = this.engine.correctCount;
    const stars = this.levelManager.getStars(correctCount);
    const hasNext = this.levelManager.hasNextLevel();

    const actions = [];
    if (hasNext) {
      actions.push({
        label: 'Next Level',
        className: 'btn-run',
        onClick: () => this._loadLevel(this.levelManager.currentLevelIndex + 1),
      });
    }
    actions.push({
      label: hasNext ? 'Retry' : 'Play Again',
      className: 'btn-clear',
      onClick: () => this._loadLevel(hasNext ? this.levelManager.currentLevelIndex : 0),
    });

    setTimeout(() => {
      this.modal.show({
        title: hasNext ? 'Level Complete!' : 'Congratulations! You Won!',
        html: `<p>You sorted ${correctCount} gems correctly!</p>`,
        stars,
        actions,
      });
    }, 500);
  }

  _onLose() {
    setTimeout(() => {
      this.modal.show({
        title: 'Try Again!',
        html:
          '<p>Too many gems were missed. Adjust your program and try again!</p>' +
          '<p style="opacity:0.6;font-size:13px">Tip: Make sure you have a REPEAT block so the arm keeps working!</p>',
        actions: [{
          label: 'Retry',
          className: 'btn-run',
          onClick: () => this._loadLevel(this.levelManager.currentLevelIndex),
        }],
      });
    }, 500);
  }

  _updateHUD() {
    const correctCount = this.engine.slots.reduce((sum, slot) =>
      sum + slot.contents.filter(g => slot.accepts(g)).length, 0);
    const incorrectCount = this.engine.slots.reduce((sum, slot) =>
      sum + slot.contents.filter(g => !slot.accepts(g)).length, 0);
    const missedCount = this.conveyor.missedCount + incorrectCount;
    const gemsRemaining = Math.max(0, this.levelManager.currentLevel.maxGems - this.conveyor.spawnedCount);
    const stars = this.levelManager.getStars(correctCount);

    this.hud.update({ correctCount, missedCount, gemsRemaining, starCount: stars });
  }
}

new App();
