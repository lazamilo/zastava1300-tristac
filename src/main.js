// 1. Icons  2. Project styles
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'locomotive-scroll/locomotive-scroll.css';
import './style.css';

import { loadImage } from './config.js';
import { gsap, ScrollTrigger, registerGsap, configureScrollTrigger } from './lib/gsap.js';
import { env, applyEnvClasses, measureViewport, onEnvChange, viewport } from './lib/vars.js';
import { computeBeats } from './lib/beats.js';
import { initScroll } from './lib/scroll.js';
import { initSplit } from './lib/split.js';
import { initPol } from './lib/pol.js';
import { initHeader } from './lib/header.js';
import { initHeroVideo } from './lib/hero-video.js';
import { initMedia } from './lib/media.js';
import { initHero } from './lib/hero.js';
import { initAbout } from './lib/about.js';
import { initMarquee } from './lib/marquee.js';
import { initWords } from './lib/words.js';
import { initCatalog, readVehicle } from './lib/catalog.js';
import { initSlider } from './lib/slider.js';

const $ = (sel) => document.querySelector(sel);

const dom = {
  header: $('[data-header]'),
  stage: $('[data-stage]'),
  scene: $('[data-scene]'),
  plate: $('[data-media]'),
  plateInner: $('[data-plate-inner]'),
  poster: $('[data-poster]'),
  video: $('[data-hero-video]'),
  cut: $('[data-cut]'),
  row: $('[data-row]'),
  hero: $('[data-hero]'),
  about: $('[data-about]'),
  slot: $('[data-media-slot]'),
  marquee: $('[data-marquee]'),
  catalog: $('[data-catalog]'),
  pin: $('[data-catalog-pin]'),
  statement: $('[data-words]'),
  widgets: $('[data-widgets]'),
  views: $('.card--views'),
  footer: $('#kontakt')
};

const withTimeout = (promise, ms) =>
  Promise.race([promise.catch(() => false), new Promise((resolve) => setTimeout(() => resolve(false), ms))]);

async function boot() {
  // 3–4. GSAP plugins and ScrollTrigger configuration
  registerGsap();
  configureScrollTrigger();

  // 5. Responsive measurements
  applyEnvClasses();
  measureViewport();

  // Media loads start immediately; reduced-motion images use the same central config.
  const posterReady = loadImage(dom.poster, 'poster', { alt: false });
  const cutReady = loadImage(dom.cut, 'cut', { alt: false });
  document.querySelectorAll('[data-rm-media]').forEach((img) => {
    img.loading = 'lazy';
    loadImage(img, img.dataset.rmMedia, { alt: false });
  });

  // 6. Scrolling
  initScroll();

  // Fonts and essential media gate the intro, with a hard failsafe.
  await withTimeout(Promise.all([document.fonts?.ready ?? Promise.resolve(), posterReady]), 3500);

  // 7. Text splitting
  if (!env.reduced) initSplit();

  // 8. Header
  const header = initHeader(dom.header);

  const vehicle = readVehicle();

  if (env.reduced) {
    // Static, fully visible layout: no scrubbing, no smooth scroll, content first.
    const catalog = initCatalog({ catalog: dom.catalog, widgets: dom.widgets, row: dom.row, vehicle });
    catalog.unlock();
    initSlider({ widget: dom.views, row: dom.row, plateInner: dom.plateInner, views: catalog.views, still: $('.catalog__rm img') });
    document.documentElement.classList.remove('is-loading');
    initPol(dom.header, { polFlip: viewport.h * 0.6 }, dom.footer);
    onEnvChange(() => window.location.reload());
    return;
  }

  // 9. Hero media
  const video = initHeroVideo(dom.video, dom.plate);
  // 10. Shared media scene
  const media = initMedia({ plate: dom.plate, row: dom.row });
  // 11. Hero entrance and exit
  const hero = initHero(dom.hero, { headerIntro: header.intro, video });
  // 12. About
  const about = initAbout(dom.about);
  // 13. Marquee
  const marquee = initMarquee(dom.marquee);
  // 14. Word-by-word statement
  const words = initWords(dom.statement);
  // 15. Rental presentation
  const catalog = initCatalog({ catalog: dom.catalog, widgets: dom.widgets, row: dom.row, vehicle });
  // 16. Vehicle-view navigation
  const slider = initSlider({ widget: dom.views, row: dom.row, plateInner: dom.plateInner, views: catalog.views });

  let ctx = null;
  let beats = null;

  const build = () => {
    ctx?.revert();
    measureViewport();
    ctx = gsap.context(() => {
      beats = computeBeats(dom);
      media.build(beats);
      hero.build(beats);
      about.build(beats);
      words.build(beats);
      catalog.build(beats);
      slider.build(beats);
      initPol(dom.header, beats, dom.footer);
    });
    marquee.build();
    ScrollTrigger.refresh();
  };

  build();
  hero.intro();

  // The footage may arrive after the first build; rebuild once so it gets its scrubber.
  withTimeout(video.ready, 8000).then((ok) => {
    if (ok) build();
  });
  cutReady.then(() => ScrollTrigger.update());

  // 17. Refresh on relevant viewport changes (width changes, or large height changes).
  let lastW = viewport.w;
  let lastH = viewport.h;
  let timer = 0;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const w = document.documentElement.clientWidth;
      const h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < (env.touch ? 160 : 1)) return;
      lastW = w;
      lastH = h;
      applyEnvClasses();
      build();
    }, 180);
  };
  window.addEventListener('resize', onResize);
  document.fonts?.addEventListener?.('loadingdone', () => build());
  onEnvChange(() => window.location.reload());
}

boot().catch((err) => {
  console.error('TRISTAĆ: inicijalizacija nije uspela.', err);
  document.documentElement.classList.remove('is-loading');
  document.documentElement.classList.add('is-reduced');
});
