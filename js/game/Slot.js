export class Slot {
  constructor({ id, label, acceptColor, acceptShape, x, y, width = 70, height = 80 }) {
    this.id = id;
    this.label = label;
    this.acceptColor = acceptColor || null;
    this.acceptShape = acceptShape || null;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.contents = [];
  }

  accepts(gem) {
    if (this.acceptColor && gem.color !== this.acceptColor) return false;
    if (this.acceptShape && gem.shape !== this.acceptShape) return false;
    return true;
  }

  addGem(gem) {
    this.contents.push(gem);
    gem.state = 'in_slot';
    gem.x = this.x + this.width / 2;
    gem.y = this.y + 15;
  }
}
