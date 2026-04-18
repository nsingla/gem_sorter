import { Gem } from './Gem.js';

export class Conveyor {
  constructor() {
    this.gems = [];
    this.speed = 40;
    this.spawnInterval = 3000;
    this.timeSinceLastSpawn = 0;
    this.gemTypes = [];
    this.totalWeight = 0;
    this.y = 0;
    this.height = 40;
    this.startX = -30;
    this.endX = 600;
    this.pickupX = 280;
    this.pickupZoneWidth = 60;
    this.beltOffset = 0;
    this.maxGems = 10;
    this.spawnedCount = 0;
    this.missedCount = 0;
  }

  configure(config, canvasWidth, canvasHeight) {
    this.speed = config.conveyorSpeed;
    this.spawnInterval = config.gemSpawnInterval;
    this.gemTypes = config.gemTypes;
    this.totalWeight = this.gemTypes.reduce((s, g) => s + g.weight, 0);
    this.maxGems = config.maxGems;
    this.endX = canvasWidth * 0.68;
    this.pickupX = canvasWidth * 0.35;
    this.y = canvasHeight * 0.30;
    this.height = 70;
    this.gems = [];
    this.spawnedCount = 0;
    this.missedCount = 0;
    this.timeSinceLastSpawn = this.spawnInterval;
    this.beltOffset = 0;
  }

  update(dt) {
    this.beltOffset = (this.beltOffset + this.speed * dt / 1000) % 20;

    this.timeSinceLastSpawn += dt;
    if (this.timeSinceLastSpawn >= this.spawnInterval && this.spawnedCount < this.maxGems) {
      this.spawnGem();
      this.timeSinceLastSpawn = 0;
    }

    for (const gem of this.gems) {
      if (gem.state === 'on_belt') {
        gem.x += this.speed * dt / 1000;
        if (gem.x > this.endX) {
          gem.state = 'fallen';
          this.missedCount++;
        }
      }
    }
  }

  spawnGem() {
    let r = Math.random() * this.totalWeight;
    for (const type of this.gemTypes) {
      r -= type.weight;
      if (r <= 0) {
        const gem = new Gem(type.color, type.shape);
        gem.x = this.startX;
        gem.y = this.y - 26;
        this.gems.push(gem);
        this.spawnedCount++;
        return gem;
      }
    }
  }

  getGemInPickupZone() {
    const zoneStart = this.pickupX - this.pickupZoneWidth / 2;
    const zoneEnd = this.pickupX + this.pickupZoneWidth / 2;
    return this.gems
      .filter(g => g.state === 'on_belt' && g.x >= zoneStart && g.x <= zoneEnd)
      .sort((a, b) => b.x - a.x)[0] || null;
  }

  get activeGemCount() {
    return this.gems.filter(g => g.state === 'on_belt' || g.state === 'targeted').length;
  }

  get isFinished() {
    return this.spawnedCount >= this.maxGems && this.activeGemCount === 0;
  }
}
