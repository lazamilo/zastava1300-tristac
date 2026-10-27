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
  }
};

export const viewport = { w: window.innerWidth, h: window.innerHeight };

// Captures the viewport once per refresh so scroll handlers never read layout.
export function measureViewport() {
  viewport.w = document.documentElement.clientWidth || window.innerWidth;
  viewport.h = window.innerHeight;
  setVar(document.documentElement, '--vh-px', `${viewport.h}px`);
  return viewport;
}

// Applies environment classes to <html> so CSS can branch on them.
export function applyEnvClasses() {
  const root = document.documentElement;
  root.classList.toggle('is-reduced', env.reduced);
  root.classList.toggle('is-mobile', env.mobile);
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
