import LocomotiveScroll from 'locomotive-scroll';
import { gsap, ScrollTrigger } from './gsap.js';
import { env } from './vars.js';

let loco = null;

// Starts Locomotive Scroll (Lenis) on GSAP's ticker and keeps ScrollTrigger in sync.
export function initScroll() {
  if (loco || env.reduced) return loco;
  loco = new LocomotiveScroll({
    lenisOptions: {
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4
    },
    scrollCallback: () => ScrollTrigger.update(),
    initCustomTicker: (render) => gsap.ticker.add(render),
    destroyCustomTicker: (render) => gsap.ticker.remove(render)
  });
  return loco;
}

export function destroyScroll() {
  loco?.destroy();
  loco = null;
}

// Smoothly scrolls to an element, selector or pixel offset; falls back to native scrolling.
export function scrollTo(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (loco) {
    loco.scrollTo(el ?? target, { duration: 1.6, ...options });
    return;
  }
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: env.reduced ? 'auto' : 'smooth' });
  else el?.scrollIntoView({ behavior: env.reduced ? 'auto' : 'smooth', block: 'start' });
}

// Pauses smooth scrolling while a modal or menu is open.
export function lockScroll(locked) {
  const lenis = loco?.lenisInstance;
  if (lenis) locked ? lenis.stop() : lenis.start();
  document.documentElement.classList.toggle('is-locked', locked);
}
