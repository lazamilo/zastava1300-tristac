import { gsap, Flip, ScrollTrigger } from './gsap.js';
import { env, blur } from './vars.js';
import { loadImage } from '../config.js';

/**
 * View navigation for the single rental car: switches between authentic views of the same
 * Tristać and their descriptions. Works with mouse, touch (swipe) and keyboard.
 */
export function initSlider({ widget, row, plateInner, views, still = null }) {
  const prev = widget.querySelector('[data-prev]');
  const next = widget.querySelector('[data-next]');
  const title = widget.querySelector('[data-view-title]');
  const text = widget.querySelector('[data-view-text]');
  const count = widget.querySelector('[data-view-count]');
  const dotsWrap = widget.querySelector('[data-view-dots]');
  const indicator = widget.querySelector('[data-view-indicator]');
  const total = views.length;
  let index = 0;
  let trigger = null;

  const pad = (n) => String(n).padStart(2, '0');

  const layerFor = (i) => (views[i]?.media === 'cut' ? plateInner : row.querySelector(`[data-view="${i}"]`));

  // Dots
  const dots = views.map((view, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'views__dot';
    b.setAttribute('aria-label', `Prikaz ${i + 1} od ${total}: ${view.title}`);
    b.addEventListener('click', () => go(i));
    dotsWrap.append(b);
    return b;
  });

  const updateText = (i, animate) => {
    const v = views[i];
    const apply = () => {
      title.textContent = v.title || '';
      text.textContent = v.text || '';
      count.textContent = `${pad(i + 1)} / ${pad(total)}`;
    };
    if (!animate) return apply();
    gsap.timeline()
      .to([title, text], { autoAlpha: 0, y: -8, ...blur(4), duration: 0.25, ease: 'power2.in', onComplete: apply })
      .fromTo([title, text], { autoAlpha: 0, y: 10, ...blur(4) }, { autoAlpha: 1, y: 0, ...blur(0), duration: 0.8, stagger: 0.06, clearProps: 'filter' });
  };

  const moveIndicator = (i, animate) => {
    const state = animate ? Flip.getState(indicator) : null;
    dots[i].append(indicator);
    dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
    if (state) Flip.from(state, { duration: 0.7, ease: 'tristac' });
  };

  const go = (target, { animate = !env.reduced } = {}) => {
    const i = ((target % total) + total) % total;
    if (i === index && animate) return;
    const from = layerFor(index);
    const to = layerFor(i);
    const dir = i > index || (index === total - 1 && i === 0) ? 1 : -1;
    index = i;
    row.classList.toggle('is-active', views[i].media !== 'cut');
    if (animate) {
      if (from && from !== to) {
        gsap.to(from, { autoAlpha: 0, xPercent: -4 * dir, ...blur(10), duration: 0.7, ease: 'power2.inOut', overwrite: true });
      }
      if (to) {
        gsap.fromTo(to,
          { autoAlpha: 0, xPercent: 4 * dir, ...blur(10) },
          { autoAlpha: 1, xPercent: 0, ...blur(0), duration: 1.1, delay: 0.12, overwrite: true });
      }
    } else {
      views.forEach((_, j) => {
        const layer = layerFor(j);
        if (layer) gsap.set(layer, { autoAlpha: j === i ? 1 : 0, xPercent: 0, filter: 'none' });
      });
    }
    // Reduced motion: the static presentation image follows the selected view.
    if (still && env.reduced) loadImage(still, views[i].media, { alt: false }).then(() => { still.alt = views[i].title || ''; });
    updateText(i, animate);
    moveIndicator(i, animate);
  };

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));

  widget.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  });

  // Touch swipe on the card.
  let startX = null;
  widget.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') startX = e.clientX;
  });
  widget.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  });

  const reset = () => go(0, { animate: false });

  // Returns to the first view whenever the visitor scrolls back above the presentation.
  const build = (beats) => {
    trigger?.kill();
    trigger = ScrollTrigger.create({
      start: beats.widgets[0],
      end: 'max',
      onLeaveBack: () => {
        if (index !== 0) reset();
      }
    });
  };

  index = -1;
  go(0, { animate: false });
  if (total < 2) {
    prev.hidden = true;
    next.hidden = true;
    dotsWrap.hidden = true;
  }

  return { go, reset, build, get index() { return index; } };
}
