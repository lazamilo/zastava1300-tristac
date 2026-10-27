import { gsap, ScrollTrigger } from './gsap.js';
import { env } from './vars.js';

/**
 * Heritage marquee: the group is cloned until the track covers twice the viewport,
 * then the track loops by exactly half its width. Clones are rebuilt, never accumulated.
 */
export function initMarquee(root) {
  const track = root.querySelector('[data-marquee-track]');
  const group = root.querySelector('[data-marquee-group]');
  let tween = null;
  let trigger = null;

  const clear = () => {
    tween?.kill();
    trigger?.kill();
    tween = null;
    trigger = null;
    track.querySelectorAll('[data-marquee-clone]').forEach((n) => n.remove());
    gsap.set(track, { clearProps: 'transform' });
  };

  const build = () => {
    clear();
    if (env.reduced) return;
    const groupW = group.offsetWidth;
    if (!groupW) return;
    const half = Math.max(1, Math.ceil(window.innerWidth / groupW));
    const total = half * 2;
    for (let i = 1; i < total; i += 1) {
      const clone = group.cloneNode(true);
      clone.setAttribute('data-marquee-clone', '');
      clone.removeAttribute('data-marquee-group');
      track.appendChild(clone);
    }
    const distance = groupW * half;
    tween = gsap.fromTo(track, { x: 0 }, {
      x: -distance,
      duration: distance / 60,
      ease: 'none',
      repeat: -1,
      paused: true
    });
    trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? tween.play() : tween.pause())
    });
    if (trigger.isActive) tween.play();
  };

  return { build, destroy: clear };
}
