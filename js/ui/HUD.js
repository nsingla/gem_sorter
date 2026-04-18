export class HUD {
  constructor() {
    this.titleEl = document.getElementById('level-title');
    this.correctEl = document.getElementById('score-correct');
    this.missedEl = document.getElementById('score-missed');
    this.starEls = document.querySelectorAll('#star-display .star');
    this.remainingEl = document.getElementById('gems-remaining');
  }

  setLevel(level) {
    this.titleEl.textContent = `Level ${level.id}: ${level.name}`;
    this.correctEl.textContent = '0';
    this.missedEl.textContent = '0';
    this.starEls.forEach(s => {
      s.textContent = '\u2606';
      s.classList.remove('earned');
    });
    this.remainingEl.textContent = '';
  }

  update({ correctCount, missedCount, gemsRemaining, starCount }) {
    this.correctEl.textContent = correctCount;
    this.missedEl.textContent = missedCount;

    if (gemsRemaining !== undefined) {
      this.remainingEl.textContent = `${gemsRemaining} gems left`;
    }

    this.starEls.forEach((s, i) => {
      if (i < starCount) {
        s.textContent = '\u2605';
        s.classList.add('earned');
      } else {
        s.textContent = '\u2606';
        s.classList.remove('earned');
      }
    });
  }
}
