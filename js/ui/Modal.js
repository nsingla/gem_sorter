export class Modal {
  constructor() {
    this.overlayEl = document.getElementById('modal-overlay');
    this.titleEl = document.getElementById('modal-title');
    this.descEl = document.getElementById('modal-description');
    this.starsEl = document.getElementById('modal-stars');
    this.actionsEl = document.getElementById('modal-actions');
  }

  show({ title, description, html, stars, actions }) {
    this.titleEl.textContent = title;
    if (html) {
      this.descEl.innerHTML = html;
    } else {
      this.descEl.textContent = description || '';
    }

    if (stars !== undefined) {
      this.starsEl.style.display = '';
      this.starsEl.textContent = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
    } else {
      this.starsEl.style.display = 'none';
    }

    this.actionsEl.innerHTML = '';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = `btn ${action.className || 'btn-run'}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        this.hide();
        action.onClick();
      });
      this.actionsEl.appendChild(btn);
    }

    this.overlayEl.classList.remove('hidden');
  }

  hide() {
    this.overlayEl.classList.add('hidden');
  }
}
