/**
 * Minimal DOM shim for running tests in Node.js.
 *
 * Only stubs the globals that game-logic modules actually touch:
 *   - document.body.className  (LevelManager sets the theme class)
 *   - getComputedStyle()       (Renderer reads CSS vars — not tested, but imported transitively)
 *
 * This is NOT a full JSDOM replacement. If a module does heavy DOM work,
 * we skip testing it here and leave it for browser-based e2e tests.
 */

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    body: { className: '' },
    getElementById: () => ({
      textContent: '',
      innerHTML: '',
      style: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      querySelectorAll: () => [],
      querySelector: () => null,
      appendChild: () => {},
      addEventListener: () => {},
      parentElement: { clientWidth: 800, clientHeight: 600 },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
      getContext: () => ({}),
    }),
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      dataset: {},
      style: {},
      innerHTML: '',
      textContent: '',
      children: [],
      classList: { add() {}, remove() {}, contains() { return false; } },
      querySelectorAll: () => [],
      querySelector: () => null,
      appendChild() {},
      remove() {},
      addEventListener() {},
      cloneNode() { return this; },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 30, width: 100, height: 30 }),
    }),
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
}

if (typeof globalThis.getComputedStyle === 'undefined') {
  globalThis.getComputedStyle = () => ({
    getPropertyValue: () => '',
  });
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}
