import { gsap } from './gsap.js';

/**
 * Hero entrance (time-based, expo-out) and exit (scrubbed by scroll).
 * Entrance animates the children; exit animates the wrapper, so the two never fight.
 */
export function initHero(hero, { headerIntro, video }) {
  const inner = hero.querySelector('[data-hero-inner]');
  const lines = [...hero.querySelectorAll('[data-hero-line]')];
  const pill = hero.querySelector('[data-hero-pill]');
  const desc = hero.querySelector('[data-hero-desc]');
  const hint = hero.querySelector('[data-hero-hint]');

  const intro = () => {
    document.documentElement.classList.remove('is-loading');
    const tl = gsap.timeline({ delay: 0.1 });
    tl.add(headerIntro(), 0);
    tl.fromTo(lines,
      { autoAlpha: 0, yPercent: 18, filter: 'blur(18px)' },
      { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', stagger: 0.14, duration: 1.8, clearProps: 'filter' }, 0.45);
    tl.fromTo([pill, desc],
      { autoAlpha: 0, y: 18, filter: 'blur(8px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', stagger: 0.1, duration: 1.4, clearProps: 'filter' }, 0.9);
    if (hint) tl.fromTo(hint, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 1.2);
    return tl;
  };

  // Scroll exit: typography blurs and fades, the footage is scrubbed with the plate.
  const build = (beats) => {
    gsap.fromTo(inner,
      { autoAlpha: 1, filter: 'blur(0px)', y: 0 },
      {
        autoAlpha: 0,
        filter: 'blur(14px)',
        y: () => -beats.vh * 0.06,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { start: beats.heroText[0], end: beats.heroText[1], scrub: true }
      });

    if (video?.ok) {
      const scrubber = { p: 0 };
      gsap.fromTo(scrubber, { p: 0 }, {
        p: 1,
        ease: 'none',
        immediateRender: false,
        onUpdate: () => video.seek(scrubber.p),
        scrollTrigger: {
          start: beats.hero[0],
          end: beats.hero[1],
          scrub: true,
          onRefresh: (self) => video.seek(self.progress)
        }
      });
    }
  };

  return { intro, build };
}
