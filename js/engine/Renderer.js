import { GEM_COLORS } from '../game/Gem.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.width = 700;
    this.height = 500;
    this.theme = {};
    this.particles = [];
    this._loadTheme();
  }

  updateDimensions(w, h) {
    this.width = w;
    this.height = h;
  }

  _loadTheme() {
    const s = getComputedStyle(document.body);
    this.theme = {
      canvasBg: s.getPropertyValue('--canvas-bg').trim() || '#0f0f23',
      conveyorColor: s.getPropertyValue('--conveyor-color').trim() || '#5d4037',
      conveyorStripe: s.getPropertyValue('--conveyor-stripe').trim() || '#795548',
      railColor: s.getPropertyValue('--rail-color').trim() || '#78909c',
      slotColor: s.getPropertyValue('--slot-color').trim() || '#33691e',
      slotBorder: s.getPropertyValue('--slot-border').trim() || '#558b2f',
      accent: s.getPropertyValue('--accent').trim() || '#81c784',
    };
  }

  reloadTheme() {
    requestAnimationFrame(() => this._loadTheme());
  }

  draw({ state, conveyor, arm, slots, dt = 16 }) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.theme.canvasBg;
    ctx.fillRect(0, 0, w, h);

    this._drawConveyor(ctx, conveyor);
    this._drawPickupZone(ctx, conveyor);
    this._drawSlots(ctx, slots);
    this._drawGemsOnBelt(ctx, conveyor);
    this._drawGemsInSlots(ctx, slots);
    this._drawArm(ctx, arm);
    this._drawHeldGem(ctx, arm);
    this._updateParticles(dt);
    this._drawParticles(ctx);
  }

  _drawConveyor(ctx, conveyor) {
    const y = conveyor.y;
    const endX = conveyor.endX + 30;
    const h = conveyor.height;

    ctx.fillStyle = this.theme.conveyorColor;
    ctx.beginPath();
    ctx.roundRect(0, y, endX, h, 4);
    ctx.fill();

    ctx.fillStyle = this.theme.conveyorStripe;
    for (let x = -(20 - (conveyor.beltOffset % 20)); x < endX; x += 20) {
      ctx.fillRect(x, y + 2, 4, h - 4);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, y, endX, h);
  }

  _drawPickupZone(ctx, conveyor) {
    const zoneX = conveyor.pickupX - conveyor.pickupZoneWidth / 2;
    const zoneW = conveyor.pickupZoneWidth;

    ctx.fillStyle = this.theme.accent + '30';
    ctx.fillRect(zoneX, conveyor.y - 20, zoneW, conveyor.height + 40);

    ctx.strokeStyle = this.theme.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(zoneX, conveyor.y - 5, zoneW, conveyor.height + 10);
    ctx.setLineDash([]);

    ctx.fillStyle = this.theme.accent;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('PICKUP', conveyor.pickupX, conveyor.y - 10);
  }

  _drawSlots(ctx, slots) {
    slots.forEach((slot, i) => {
      const hasColorHint = slot.acceptColor && GEM_COLORS[slot.acceptColor];

      ctx.fillStyle = hasColorHint ? GEM_COLORS[slot.acceptColor] + '25' : this.theme.slotColor;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 6);
      ctx.fill();

      ctx.strokeStyle = hasColorHint ? GEM_COLORS[slot.acceptColor] + '80' : this.theme.slotBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 6);
      ctx.stroke();

      ctx.fillStyle = hasColorHint ? GEM_COLORS[slot.acceptColor] + '40' : this.theme.slotColor;
      ctx.beginPath();
      ctx.moveTo(slot.x + 8, slot.y);
      ctx.lineTo(slot.x + slot.width / 2, slot.y + 12);
      ctx.lineTo(slot.x + slot.width - 8, slot.y);
      ctx.closePath();
      ctx.fill();

      // Slot number badge
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(slot.x + slot.width - 10, slot.y + 14, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, slot.x + slot.width - 10, slot.y + 18);

      // Sample gem icon showing what this slot expects
      const iconColor = slot.acceptColor || null;
      const iconShape = slot.acceptShape || 'circle';
      const cx = slot.x + slot.width / 2;
      const cy = slot.y + slot.height / 2;
      const count = slot.contents.filter(g => slot.accepts(g)).length;

      if (count === 0) {
        ctx.globalAlpha = 0.35;
        this._drawGem(ctx, cx, cy, 14, iconColor, iconShape);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = this.theme.accent;
        ctx.font = 'bold 16px system-ui';
        ctx.fillText(count.toString(), cx, cy + 5);
      }

    });
  }

  _drawGemsOnBelt(ctx, conveyor) {
    for (const gem of conveyor.gems) {
      if (gem.state === 'on_belt' || gem.state === 'targeted') {
        this._drawGem(ctx, gem.x, gem.y, 30, gem.color, gem.shape);
      }
    }
  }

  _drawGemsInSlots(ctx, slots) {
    for (const slot of slots) {
      const visible = slot.contents.slice(-5);
      visible.forEach((gem, i) => {
        this._drawGem(ctx, slot.x + slot.width / 2, slot.y + 20 + i * 10, 8, gem.color, gem.shape);
      });
    }
  }

  _drawGem(ctx, x, y, size, color, shape) {
    const fill = GEM_COLORS[color] || '#fff';
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = fill;
    ctx.shadowBlur = 8;
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;

    this._tracePath(ctx, shape, size);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    const grad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _tracePath(ctx, shape, size) {
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size * 0.7);
        ctx.lineTo(-size, size * 0.7);
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? size : size * 0.4;
          if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          if (i === 0) ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
          else ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.closePath();
        break;
      default:
        ctx.arc(0, 0, size, 0, Math.PI * 2);
    }
  }

  _drawArm(ctx, arm) {
    const px = arm.pivotX;
    const py = arm.pivotY;
    const ex = arm.elbowX;
    const ey = arm.elbowY;
    const hx = arm.handX;
    const hy = arm.handY;

    // Base mount bracket
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(px - 30, 0, 60, 8);
    ctx.beginPath();
    ctx.moveTo(px - 16, 8);
    ctx.lineTo(px + 16, 8);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Boom shadow
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px + 2, py + 2);
    ctx.lineTo(ex + 2, ey + 2);
    ctx.stroke();
    ctx.restore();

    // Boom
    ctx.save();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();

    // Elbow joint
    ctx.fillStyle = '#607d8b';
    ctx.beginPath();
    ctx.arc(ex, ey, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stick shadow
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex + 2, ey + 2);
    ctx.lineTo(hx + 2, hy + 2);
    ctx.stroke();
    ctx.restore();

    // Stick
    ctx.save();
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();

    // Pivot joint (on top)
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Claw
    const gripW = arm.gripOpen ? 16 : 8;
    const gripH = 12;

    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - gripW / 2, hy + gripH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + gripW / 2, hy + gripH);
    ctx.stroke();

    // Hand joint
    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'butt';
  }

  _drawHeldGem(ctx, arm) {
    if (arm.heldGem && arm.heldGem.state === 'held') {
      this._drawGem(ctx, arm.heldGem.x, arm.heldGem.y, 16, arm.heldGem.color, arm.heldGem.shape);
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      p.vy += 0.05 * dt / 16;
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  addParticles(x, y, color, count = 10) {
    const fill = GEM_COLORS[color] || '#fff';
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 1) * 2,
        size: 3 + Math.random() * 3,
        color: fill,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
      });
    }
  }
}
