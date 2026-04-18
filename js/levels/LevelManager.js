import { levels } from './levels.js';
import { Slot } from '../game/Slot.js';
import { GEM_SHAPES } from '../game/Gem.js';

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export class LevelManager {
  constructor() {
    this.currentLevelIndex = 0;
    this.currentLevel = null;
  }

  loadLevel(index, canvasWidth, canvasHeight) {
    this.currentLevelIndex = index;
    const baseLevel = levels[index];
    if (!baseLevel) return null;

    const gemTypes = this._randomizeGemTypes(baseLevel);
    this.currentLevel = { ...baseLevel, gemTypes };

    document.body.className = `theme-${this.currentLevel.theme}`;

    const slotConfigs = this.currentLevel.slots;
    const totalSlots = slotConfigs.length;
    const slotWidth = 70;
    const gap = 20;
    const totalWidth = totalSlots * slotWidth + (totalSlots - 1) * gap;
    const startX = canvasWidth * 0.42 - totalWidth / 2;
    const slotY = canvasHeight * 0.75;

    const slots = slotConfigs.map((cfg, i) => new Slot({
      ...cfg,
      x: startX + i * (slotWidth + gap),
      y: slotY,
      width: slotWidth,
      height: 80,
    }));

    const colors = [...new Set(gemTypes.map(g => g.color))];
    const shapes = [...new Set(gemTypes.map(g => g.shape))];
    const slotLabels = slotConfigs.map((_, i) => ({
      value: `${i + 1}`,
      label: `${i + 1}`,
    }));

    return {
      level: this.currentLevel,
      slots,
      levelOptions: { colors, shapes, slotLabels },
    };
  }

  _randomizeGemTypes(level) {
    const sortsByColor = level.slots.every(s => s.acceptColor && !s.acceptShape);
    const sortsByShape = level.slots.every(s => s.acceptShape && !s.acceptColor);

    if (sortsByColor) {
      const shuffledShapes = this._shuffle([...GEM_SHAPES]);
      return level.gemTypes.map((gt, i) => ({
        ...gt,
        shape: shuffledShapes[i % shuffledShapes.length],
      }));
    }

    if (sortsByShape) {
      const shuffledColors = this._shuffle([...ALL_COLORS]);
      return level.gemTypes.map((gt, i) => ({
        ...gt,
        color: shuffledColors[i % shuffledColors.length],
      }));
    }

    return level.gemTypes;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getStars(correctCount) {
    const t = this.currentLevel.starThresholds;
    if (correctCount >= t[2]) return 3;
    if (correctCount >= t[1]) return 2;
    if (correctCount >= t[0]) return 1;
    return 0;
  }

  hasNextLevel() {
    return this.currentLevelIndex < levels.length - 1;
  }

  get totalLevels() {
    return levels.length;
  }
}
