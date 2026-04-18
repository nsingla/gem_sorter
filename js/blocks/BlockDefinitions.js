export const BLOCK_DEFS = {
  if_color: {
    type: 'if_color',
    category: 'condition',
    label: 'IF gem is',
    hasBody: true,
    params: [
      { name: 'color', type: 'dropdown', options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] },
    ],
  },
  if_shape: {
    type: 'if_shape',
    category: 'condition',
    label: 'IF shape is',
    hasBody: true,
    params: [
      { name: 'shape', type: 'dropdown', options: ['circle', 'diamond', 'triangle', 'star', 'hexagon'] },
    ],
  },
  if_color_and_shape: {
    type: 'if_color_and_shape',
    category: 'condition',
    label: 'IF gem is',
    hasBody: true,
    params: [
      { name: 'color', type: 'dropdown', options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] },
      { name: 'shape', type: 'dropdown', options: ['circle', 'diamond', 'triangle', 'star', 'hexagon'] },
    ],
  },
  pick_gem: {
    type: 'pick_gem',
    category: 'action',
    label: 'PICK gem',
    hasBody: false,
    params: [],
  },
  place_in_slot: {
    type: 'place_in_slot',
    category: 'action',
    label: 'PLACE in slot',
    hasBody: false,
    params: [
      { name: 'slot', type: 'dropdown', options: [] },
    ],
  },
  repeat: {
    type: 'repeat',
    category: 'flow',
    label: 'REPEAT',
    hasBody: true,
    params: [
      { name: 'count', type: 'dropdown', options: ['forever', '2', '3', '5', '10'] },
    ],
  },
  wait: {
    type: 'wait',
    category: 'flow',
    label: 'WAIT',
    hasBody: false,
    params: [
      { name: 'seconds', type: 'dropdown', options: ['0.5', '1', '2'] },
    ],
  },
};

export const CATEGORY_COLORS = {
  condition: '#4C97FF',
  action: '#9966FF',
  flow: '#FFAB19',
};
