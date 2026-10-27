import { gsap } from './gsap.js';
import { scrollTo, lockScroll } from './scroll.js';
import { env } from './vars.js';

let menuOpen = false;

// Wires navigation, the accessible mobile menu and inquiry triggers. Returns the intro builder.
export function initHeader(header) {
  const items = [...header.querySelectorAll('[data-header-item]')];
  const mark = header.querySelector('[data-mark]');
  const toggle = header.querySelector('[data-menu-toggle]');
  const menu = header.querySelector('[data-menu]');

  const setMenu = (open) => {
    if (open === menuOpen) return;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zatvori meni' : 'Otvori meni');
    header.classList.toggle('is-menu', open);
    lockScroll(open);
    if (open) {
      menu.hidden = false;
      gsap.fromTo(menu, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: env.reduced ? 0 : 0.6 });
      gsap.fromTo(menu.querySelectorAll('li, .menu__cta'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: env.reduced ? 0 : 0.8 });
      menu.querySelector('a')?.focus();
    } else {
      gsap.to(menu, {
        autoAlpha: 0,
        y: -8,
        duration: env.reduced ? 0 : 0.35,
        ease: 'power2.in',
        onComplete: () => { menu.hidden = true; }
      });
    }
  };

  toggle.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) {
      setMenu(false);
      toggle.focus();
    }
  });

  // In-page navigation through the smooth scroller.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-nav]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (!hash?.startsWith('#')) return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    // Pinned sections can ask to land on their resolved state (offset in viewport heights).
    const settle = env.reduced ? 0 : parseFloat(target.dataset.navOffset || '0') * window.innerHeight;
    scrollTo(hash === '#pocetna' ? 0 : target, { offset: settle });
    history.replaceState(null, '', hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // Any [data-inquiry-open] opens the inquiry dialog (owned by catalog.js).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-inquiry-open]');
    if (!btn) return;
    if (menuOpen) setMenu(false);
    document.dispatchEvent(new CustomEvent('tristac:inquiry', { detail: { opener: btn } }));
  });

  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches && menuOpen) setMenu(false);
  });

  // Intro: items rise one by one, then the brand mark draws in.
  const intro = () => {
    const tl = gsap.timeline();
    tl.fromTo(items, { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.07, duration: 1.3 }, 0);
    if (mark) {
      tl.fromTo(mark.querySelectorAll('circle'),
        { scale: 0, transformOrigin: '50% 50%' },
        { scale: 1, stagger: 0.12, duration: 1.1 }, 0.25);
    }
    return tl;
  };

  return { intro, setMenu };
}
