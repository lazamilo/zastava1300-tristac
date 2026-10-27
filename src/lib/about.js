import { gsap } from './gsap.js';
import { blur } from './vars.js';
import { splitLines } from './split.js';

/**
 * About section: masked line reveal, rising CTA, and a soft blur-out as the plate departs.
 */
export function initAbout(about) {
  const heading = about.querySelector('[data-split="lines"]');
  const eyebrow = about.querySelector('[data-about-eyebrow]');
  const cta = about.querySelector('[data-about-cta]');
  const copy = about.querySelector('[data-about-copy]');
  let split = null;

  const build = (beats) => {
    split?.revert();
    split = splitLines(heading, (lines) =>
      gsap.fromTo(lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          stagger: 0.09,
          duration: 1.4,
          scrollTrigger: { trigger: heading, start: 'top 82%', toggleActions: 'play none none reverse' }
        }));

    gsap.fromTo(eyebrow, { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1, y: 0, duration: 1.2,
      scrollTrigger: { trigger: heading, start: 'top 86%', toggleActions: 'play none none reverse' }
    });

    gsap.fromTo(cta, { autoAlpha: 0, yPercent: 60 }, {
      autoAlpha: 1, yPercent: 0, duration: 1.3, delay: 0.25,
      scrollTrigger: { trigger: cta, start: 'top 92%', toggleActions: 'play none none reverse' }
    });

    // Scene transitions out with subtle blur.
    gsap.fromTo(copy, { ...blur(0), autoAlpha: 1 }, {
      ...blur(10),
      autoAlpha: 0,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { start: beats.aboutOut[0], end: beats.aboutOut[1], scrub: true }
    });
  };

  const destroy = () => {
    split?.revert();
    split = null;
  };

  return { build, destroy };
}
