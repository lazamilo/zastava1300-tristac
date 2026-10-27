// Environment flags, viewport measurements and memoised CSS-variable writes.

const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqMobile = window.matchMedia('(max-width: 767px)');

export const env = {
  get reduced() {
    return mqReduced.matches;
  },
  get mobile() {
    return mqMobile.matches;
  },
  get touch() {
    return window.matchMedia('(pointer: coarse)').matches;
  },
  // Phones and tablets: skip effects that repaint large layers on every scroll frame.
  get lite() {
    return this.mobile || this.touch;
  },
  // How much hero media a lite device gets: 'full', 'low' (smaller frames) or 'still' (one image).
  // Memory and connection hints come from Chrome; Safari reports none and gets 'full'.
  // `?tier=low` (or full / still) in the URL forces a tier for testing.
  get tier() {
    const forced = new URLSearchParams(window.location.search).get('tier');
    if (['full', 'low', 'still'].includes(forced)) return forced;
    const memory = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const connection = navigator.connection;
    const type = connection?.effectiveType || '';
    if (connection?.saveData || type.endsWith('2g') || (memory && memory <= 2)) return 'still';
    if ((memory && memory <= 4) || (cores && cores <= 4) || type === '3g') return 'low';
    return 'full';
  }
};

// Blur as tween props, or nothing on lite devices where animated filters cause jank.
export const blur = (n) => (env.lite ? {} : { filter: `blur(${n}px)` });

export const viewport = { w: window.innerWidth, h: window.innerHeight, cover: window.innerHeight };

let probe = null;

// Height of the viewport with the mobile browser toolbars collapsed (100lvh); equals the
// current height on desktop or where lvh is unsupported.
function largeViewportHeight() {
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none;';
    document.body.append(probe);
  }
  return probe.offsetHeight || window.innerHeight;
}

// Captures the viewport once per refresh so scroll handlers never read layout.
export function measureViewport() {
  viewport.w = document.documentElement.clientWidth || window.innerWidth;
  viewport.h = window.innerHeight;
  // Full-bleed media is sized to the tallest the viewport gets, so no edge shows when the
  // mobile toolbars collapse during scrolling.
  viewport.cover = Math.max(viewport.h, largeViewportHeight());
  setVar(document.documentElement, '--vh-px', `${viewport.h}px`);
  setVar(document.documentElement, '--vh-cover', `${viewport.cover}px`);
  return viewport;
}

// Applies environment classes to <html> so CSS can branch on them.
export function applyEnvClasses() {
  const root = document.documentElement;
  root.classList.toggle('is-reduced', env.reduced);
  root.classList.toggle('is-mobile', env.mobile);
  root.classList.toggle('is-lite', env.lite);
  root.classList.toggle('is-motion', !env.reduced);
}

// Calls back when reduced-motion or the mobile breakpoint flips. Returns a cleanup.
export function onEnvChange(callback) {
  const handler = () => {
    applyEnvClasses();
    callback();
  };
  mqReduced.addEventListener('change', handler);
  mqMobile.addEventListener('change', handler);
  return () => {
    mqReduced.removeEventListener('change', handler);
    mqMobile.removeEventListener('change', handler);
  };
}

const memo = new WeakMap();

// Writes a custom property only when its serialized value changed.
export function setVar(el, name, value) {
  let cache = memo.get(el);
  if (!cache) {
    cache = new Map();
    memo.set(el, cache);
  }
  const v = typeof value === 'number' ? `${Math.round(value * 1000) / 1000}` : value;
  if (cache.get(name) === v) return;
  cache.set(name, v);
  el.style.setProperty(name, v);
}

export function px(value) {
  return `${Math.round(value * 100) / 100}px`;
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
