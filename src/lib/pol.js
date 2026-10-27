import { ScrollTrigger } from './gsap.js';

let header = null;
let current = null;
let trigger = null;

// Sets header polarity: "light" (white UI over footage/black) or "dark" (black UI over white).
export function setPol(state) {
  if (!header || state === current) return;
  current = state;
  header.classList.toggle('is-dark', state === 'dark');
  header.dataset.pol = state;
}

// Drives polarity from scroll position using measured beats; fully reversible.
export function initPol(el, beats, footer) {
  header = el;
  trigger?.kill();
  const footerTop = () => footer.getBoundingClientRect().top + window.scrollY;
  let fTop = footerTop();
  let half = header.offsetHeight / 2;
  const resolve = (scroll) => {
    if (scroll < beats.polFlip || scroll + half >= fTop) return 'light';
    return 'dark';
  };
  trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onRefresh: (self) => {
      fTop = footerTop();
      half = header.offsetHeight / 2;
      setPol(resolve(self.scroll()));
    },
    onUpdate: (self) => setPol(resolve(self.scroll()))
  });
  setPol(resolve(window.scrollY));
  return trigger;
}
