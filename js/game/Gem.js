let nextId = 0;

export const GEM_COLORS = {
  red: '#ef5350',
  blue: '#42a5f5',
  green: '#66bb6a',
  yellow: '#ffee58',
  purple: '#ab47bc',
  orange: '#ffa726',
};

export const GEM_SHAPES = ['circle', 'diamond', 'triangle', 'star', 'hexagon'];

export class Gem {
  constructor(color, shape) {
    this.id = nextId++;
    this.color = color;
    this.shape = shape;
    this.x = 0;
    this.y = 0;
    this.state = 'on_belt';
    this.opacity = 1;
  }
}
