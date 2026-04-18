import { BLOCK_DEFS, CATEGORY_COLORS } from './BlockDefinitions.js';

export class BlockWorkspace {
  constructor(paletteEl, programEl) {
    this.paletteEl = paletteEl;
    this.programEl = programEl;
    this.availableBlocks = [];
    this.levelOptions = { colors: [], shapes: [], slotLabels: [] };
    this.dragState = null;
    this._setupDragListeners();
  }

  configure(availableBlocks, levelOptions) {
    this.availableBlocks = availableBlocks;
    this.levelOptions = levelOptions;
    this._renderPalette();
    this.clear();
  }

  clear() {
    this.programEl.querySelectorAll('.program-block').forEach(b => b.remove());
    this._updateHint();
  }

  _renderPalette() {
    this.paletteEl.innerHTML = '';
    for (const blockType of this.availableBlocks) {
      const def = BLOCK_DEFS[blockType];
      if (!def) continue;

      const el = document.createElement('div');
      el.className = `palette-block block-${def.category}`;
      el.dataset.blockType = blockType;
      el.style.background = CATEGORY_COLORS[def.category];

      let html = `<span>${def.label}</span>`;
      for (const param of def.params) {
        const opts = this._paramOptions(param);
        html += ` <select class="block-param" data-param="${param.name}" onmousedown="event.stopPropagation()">`;
        for (const o of opts) {
          html += `<option value="${o.value}">${o.label}</option>`;
        }
        html += '</select>';
      }

      el.innerHTML = html;
      this._bindActionToggle(el);
      this.paletteEl.appendChild(el);
    }
  }

  _paramOptions(param) {
    switch (param.name) {
      case 'color': return this.levelOptions.colors.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
      case 'shape': return this.levelOptions.shapes.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
      case 'slot': return this.levelOptions.slotLabels;
      default: return param.options.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
    }
  }

  _createProgramBlock(blockType, params = {}) {
    const def = BLOCK_DEFS[blockType];
    if (!def) return null;

    const el = document.createElement('div');
    el.className = `program-block block-${def.category}${def.hasBody ? ' has-body' : ''}`;
    el.dataset.blockType = blockType;
    el.style.background = CATEGORY_COLORS[def.category];

    let headerHTML = `<span>${def.label}</span>`;
    for (const param of def.params) {
      const opts = this._paramOptions(param);
      const selected = params[param.name] || (opts[0] && opts[0].value);
      headerHTML += ` <select class="block-param" data-param="${param.name}" onmousedown="event.stopPropagation()">`;
      for (const o of opts) {
        headerHTML += `<option value="${o.value}"${o.value === selected ? ' selected' : ''}>${o.label}</option>`;
      }
      headerHTML += '</select>';
    }

    let html = `<div class="block-header">${headerHTML}</div>`;
    html += '<button class="block-delete" onmousedown="event.stopPropagation()">&#215;</button>';

    if (def.hasBody) {
      html += '<div class="block-body"></div>';
      html += `<div class="block-footer" style="background:${CATEGORY_COLORS[def.category]}"></div>`;
    }

    el.innerHTML = html;

    el.querySelector('.block-delete').addEventListener('click', () => {
      el.remove();
      this._updateHint();
    });

    this._bindActionToggle(el);

    return el;
  }

  _bindActionToggle(el) {
    const actionSel = el.querySelector('[data-param="action"]');
    if (!actionSel) return;
    const slotSel = el.querySelector('[data-param="slot"]');
    if (!slotSel) return;

    const sync = () => {
      slotSel.style.display = actionSel.value === 'skip gem' ? 'none' : '';
    };
    actionSel.addEventListener('change', sync);
    sync();
  }

  _setupDragListeners() {
    let ghostEl = null;
    let sourceEl = null;

    const onDown = (e) => {
      if (e.button !== 0) return;
      const block = e.target.closest('.palette-block, .program-block');
      if (!block) return;
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
      e.preventDefault();

      const isPalette = block.classList.contains('palette-block');

      if (isPalette) {
        const params = {};
        block.querySelectorAll('.block-param').forEach(sel => {
          params[sel.dataset.param] = sel.value;
        });
        sourceEl = this._createProgramBlock(block.dataset.blockType, params);
      } else {
        sourceEl = block;
      }

      ghostEl = sourceEl.cloneNode(true);
      ghostEl.className = sourceEl.className + ' drag-ghost';
      const rect = block.getBoundingClientRect();
      ghostEl.style.width = rect.width + 'px';
      document.body.appendChild(ghostEl);

      if (!isPalette) {
        sourceEl.style.opacity = '0.3';
      }

      this.dragState = {
        isPalette,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };

      ghostEl.style.left = (e.clientX - this.dragState.offsetX) + 'px';
      ghostEl.style.top = (e.clientY - this.dragState.offsetY) + 'px';
    };

    const onMove = (e) => {
      if (!this.dragState || !ghostEl) return;
      ghostEl.style.left = (e.clientX - this.dragState.offsetX) + 'px';
      ghostEl.style.top = (e.clientY - this.dragState.offsetY) + 'px';

      this._clearHighlights();
      const target = this._findDrop(e.clientX, e.clientY);
      if (target) {
        if (target.type === 'before') target.element.classList.add('drag-over-before');
        else if (target.type === 'body') target.element.classList.add('drop-highlight');
      }
    };

    const onUp = (e) => {
      if (!this.dragState || !ghostEl) return;

      this._clearHighlights();
      ghostEl.remove();
      ghostEl = null;

      const rect = this.programEl.getBoundingClientRect();
      const inProgram = e.clientX >= rect.left && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (inProgram) {
        if (!this.dragState.isPalette) sourceEl.style.opacity = '';

        const target = this._findDrop(e.clientX, e.clientY);
        if (target) {
          if (target.type === 'before') {
            target.element.parentNode.insertBefore(sourceEl, target.element);
          } else if (target.type === 'body') {
            target.element.appendChild(sourceEl);
          }
        } else {
          this.programEl.appendChild(sourceEl);
        }
      } else if (!this.dragState.isPalette) {
        sourceEl.remove();
      }

      sourceEl = null;
      this.dragState = null;
      this._updateHint();
    };

    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('#workspace')) onDown(e);
    });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  _findDrop(mx, my) {
    // Find the deepest (innermost) block-body containing the mouse.
    // querySelectorAll returns document order, so the last match is the deepest.
    let deepestBody = null;
    for (const body of this.programEl.querySelectorAll('.block-body')) {
      const r = body.getBoundingClientRect();
      if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) {
        deepestBody = body;
      }
    }

    if (deepestBody) {
      for (const child of deepestBody.querySelectorAll(':scope > .program-block')) {
        const r = child.getBoundingClientRect();
        if (mx >= r.left && mx <= r.right && my < r.top + r.height / 2) {
          return { type: 'before', element: child };
        }
      }
      return { type: 'body', element: deepestBody };
    }

    // No body match — check top-level blocks for "before" insertion
    for (const block of this.programEl.querySelectorAll(':scope > .program-block')) {
      const r = block.getBoundingClientRect();
      if (mx >= r.left && mx <= r.right && my < r.top + r.height / 2) {
        return { type: 'before', element: block };
      }
    }

    return null;
  }

  _clearHighlights() {
    document.querySelectorAll('.drag-over-before').forEach(el => el.classList.remove('drag-over-before'));
    document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
  }

  _updateHint() {
    const hint = this.programEl.querySelector('.program-hint');
    const hasBlocks = !!this.programEl.querySelector('.program-block');
    if (hint) hint.style.display = hasBlocks ? 'none' : '';
    this.programEl.classList.toggle('empty', !hasBlocks);
  }

  getProgram() {
    const instructions = [];
    const topBlocks = this.programEl.querySelectorAll(':scope > .program-block');
    for (const block of topBlocks) {
      this._serialize(block, instructions);
    }
    return instructions;
  }

  _serialize(blockEl, instructions) {
    const type = blockEl.dataset.blockType;
    const params = {};
    blockEl.querySelectorAll(':scope > .block-header .block-param').forEach(sel => {
      params[sel.dataset.param] = sel.value;
    });

    const def = BLOCK_DEFS[type];
    if (def && def.hasBody) {
      const idx = instructions.length;
      const instr = { type, ...params, bodyStart: idx + 1, bodyEnd: -1 };
      instructions.push(instr);

      const body = blockEl.querySelector('.block-body');
      if (body) {
        for (const child of body.querySelectorAll(':scope > .program-block')) {
          this._serialize(child, instructions);
        }
      }
      instr.bodyEnd = instructions.length;
    } else {
      instructions.push({ type, ...params });
    }
  }

  setEnabled(enabled) {
    const opacity = enabled ? '' : '0.7';
    const events = enabled ? '' : 'none';

    this.programEl.querySelectorAll('.program-block').forEach(b => {
      b.style.pointerEvents = events;
      b.style.opacity = opacity;
    });
    this.paletteEl.querySelectorAll('.palette-block').forEach(b => {
      b.style.pointerEvents = events;
      b.style.opacity = enabled ? '' : '0.5';
    });
  }
}
