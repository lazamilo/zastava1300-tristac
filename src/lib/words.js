import { gsap } from './gsap.js';
import { getWords } from './split.js';

/**
 * Central statement: each word resolves from faint and blurred to solid, tied to scroll.
 */
export function initWords(statement) {
  const build = (beats) => {
    const words = getWords(statement);
    if (!words.length) return;
    gsap.timeline({
      scrollTrigger: { start: beats.words[0], end: beats.words[1], scrub: true }
    }).fromTo(words,
      { opacity: 0.12, filter: 'blur(6px)', yPercent: 12 },
      { opacity: 1, filter: 'blur(0px)', yPercent: 0, ease: 'none', stagger: 0.12, duration: 0.6 });

    // Clears the stage for the car presentation.
    gsap.fromTo(statement, { autoAlpha: 1, filter: 'blur(0px)', y: 0 }, {
      autoAlpha: 0,
      filter: 'blur(12px)',
      y: -beats.vh * 0.05,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { start: beats.statementOut[0], end: beats.statementOut[1], scrub: true }
    });
  };

  return { build };
}
