import { levels } from './levels.js';
import { Slot } from '../game/Slot.js';
import { GEM_SHAPES } from '../game/Gem.js';

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export class LevelManager {
  constructor() {
    this.currentLevelIndex = -1;
    this.currentLevel = null;
    this._cachedGeneration = null;
  }

  loadLevel(index, canvasWidth, canvasHeight, { regenerate = true } = {}) {
    const baseLevel = levels[index];
    if (!baseLevel) return null;

    if (regenerate || index !== this.currentLevelIndex || !this._cachedGeneration) {
      this._cachedGeneration = this._generateGemTypesAndSlots(baseLevel);
    }

    this.currentLevelIndex = index;
    const { gemTypes, slotConfigs } = this._cachedGeneration;
    this.currentLevel = { ...baseLevel, gemTypes, slots: slotConfigs };

    document.body.className = `theme-${this.currentLevel.theme}`;

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

  _generateGemTypesAndSlots(level) {
    const colors = this._shuffle([...ALL_COLORS]);
    const shapes = this._shuffle([...GEM_SHAPES]);
    const gemTypes = [];
    const slotConfigs = [];

    switch (level.sortBy) {
      case 'color': {
        for (let i = 0; i < level.numSlots; i++) {
          gemTypes.push({ color: colors[i], shape: shapes[i], weight: level.gemWeight });
          slotConfigs.push({
            id: i,
            label: `${this._cap(colors[i])} ${this._cap(shapes[i])}`,
            acceptColor: colors[i],
            acceptShape: shapes[i],
          });
        }
        for (let i = 0; i < level.numDistractors; i++) {
          gemTypes.push({
            color: colors[level.numSlots + i],
            shape: shapes[(level.numSlots + i) % shapes.length],
            weight: level.distractorWeight,
          });
        }
        break;
      }

      case 'shape': {
        const singleColor = colors[0];
        for (let i = 0; i < level.numSlots; i++) {
          gemTypes.push({ color: singleColor, shape: shapes[i], weight: level.gemWeight });
          slotConfigs.push({
            id: i,
            label: this._cap(shapes[i]) + 's',
            acceptColor: null,
            acceptShape: shapes[i],
          });
        }
        for (let i = 0; i < level.numDistractors; i++) {
          gemTypes.push({
            color: singleColor,
            shape: shapes[(level.numSlots + i) % shapes.length],
            weight: level.distractorWeight,
          });
        }
        break;
      }

      case 'color_and_shape': {
        for (let i = 0; i < level.numSlots; i++) {
          gemTypes.push({ color: colors[i], shape: shapes[i], weight: level.gemWeight });
          slotConfigs.push({
            id: i,
            label: `${this._cap(colors[i])} ${this._cap(shapes[i])}`,
            acceptColor: colors[i],
            acceptShape: shapes[i],
          });
        }
        const distractorPool = [];
        for (let ci = 0; ci < level.numSlots; ci++) {
          for (let si = 0; si < level.numSlots; si++) {
            if (ci !== si) {
              distractorPool.push({ color: colors[ci], shape: shapes[si] });
            }
          }
        }
        const shuffledDistractors = this._shuffle(distractorPool);
        for (let i = 0; i < Math.min(level.numDistractors, shuffledDistractors.length); i++) {
          gemTypes.push({ ...shuffledDistractors[i], weight: level.distractorWeight });
        }
        break;
      }
    }

    return { gemTypes, slotConfigs };
  }

  _cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
