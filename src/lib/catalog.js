import { gsap } from './gsap.js';
import { blur } from './vars.js';
import { lockScroll } from './scroll.js';
import { loadImage, MEDIA_ALT, FALLBACK_CREDIT, onFallback } from '../config.js';

const PLACEHOLDER = 'Na upit';

// Reads the owner-editable vehicle configuration embedded in index.html.
export function readVehicle() {
  const node = document.querySelector('[data-vehicle]');
  try {
    return JSON.parse(node?.textContent || '{}');
  } catch (err) {
    console.warn('TRISTAĆ: konfiguracija vozila nije ispravan JSON.', err);
    return {};
  }
}

function formatPrice(pricing = {}) {
  if (typeof pricing.amount === 'number' && pricing.amount > 0) {
    const value = new Intl.NumberFormat('sr-Latn-RS', { maximumFractionDigits: 0 }).format(pricing.amount);
    return `${value} ${pricing.currency || 'RSD'}`;
  }
  return pricing.placeholder || 'Cena na upit';
}

function fill(root, name, text) {
  root.querySelectorAll(`[data-field="${name}"]`).forEach((el) => {
    el.textContent = text ?? '';
    el.hidden = !text;
  });
}

function dlRows(list, rows) {
  list.replaceChildren();
  rows.forEach(({ label, value, href, external, icon }) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    if (href && value) {
      const a = document.createElement('a');
      a.href = href;
      if (icon) {
        a.classList.add('has-icon');
        const i = document.createElement('i');
        i.className = `bi bi-${icon}`;
        i.setAttribute('aria-hidden', 'true');
        a.append(i);
      }
      a.append(value);
      if (external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      dd.append(a);
    } else {
      dd.textContent = value ?? PLACEHOLDER;
      if (value == null) dd.classList.add('is-placeholder');
    }
    wrap.append(dt, dd);
    list.append(wrap);
  });
}

// Opens a native <dialog> with scroll lock and focus return.
function bindDialog(dialog) {
  let opener = null;
  const open = (from) => {
    opener = from || document.activeElement;
    if (dialog.open) return;
    dialog.showModal();
    lockScroll(true);
    gsap.fromTo(dialog.querySelector('.dialog__panel'),
      { autoAlpha: 0, y: 24, ...blur(6) },
      { autoAlpha: 1, y: 0, ...blur(0), duration: 0.9, clearProps: 'filter' });
  };
  const close = () => {
    if (dialog.open) dialog.close();
  };
  dialog.addEventListener('close', () => {
    lockScroll(false);
    opener?.focus?.();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.querySelectorAll('[data-dialog-close]').forEach((b) => b.addEventListener('click', close));
  return { open, close };
}

/**
 * Rental presentation: fills the cards and views from configuration, owns the inquiry
 * and details dialogs, and animates the cards rising from the bottom in sequence.
 */
export function initCatalog({ catalog, widgets, row, vehicle }) {
  const v = vehicle;
  const cards = [...widgets.querySelectorAll('[data-widget]')];

  fill(catalog, 'name', v.name);
  fill(catalog, 'description', v.description);
  fill(catalog, 'location', v.location);
  fill(catalog, 'category', v.category);
  fill(catalog, 'priceLabel', v.pricing?.label || 'Cena po danu');
  fill(catalog, 'price', formatPrice(v.pricing));
  fill(catalog, 'priceNote', v.pricing?.note);
  catalog.querySelector('[data-field="price"]')?.classList.toggle('is-placeholder', !(v.pricing?.amount > 0));

  // Photo views live in the scene row, stacked at the presentation rect.
  const views = Array.isArray(v.views) && v.views.length ? v.views : [{ media: 'cut', title: v.name, text: v.description }];
  row.replaceChildren();
  views.forEach((view, i) => {
    if (view.media === 'cut') return;
    const fig = document.createElement('figure');
    fig.className = 'row__view';
    fig.dataset.view = String(i);
    const img = document.createElement('img');
    img.alt = MEDIA_ALT[view.media] || view.title || '';
    img.decoding = 'async';
    img.loading = 'lazy';
    fig.append(img);
    row.append(fig);
    loadImage(img, view.media);
  });

  // Details dialog.
  const details = document.querySelector('[data-details]');
  const detailsDialog = bindDialog(details);
  const lead = details.querySelector('[data-details-lead]');
  lead.textContent = v.details?.lead || '';
  lead.hidden = !lead.textContent;
  dlRows(details.querySelector('[data-details-list]'), v.details?.specs || []);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-details-open]');
    if (btn) detailsDialog.open(btn);
  });

  // Inquiry dialog.
  const inquiry = document.querySelector('[data-inquiry]');
  const inquiryDialog = bindDialog(inquiry);
  const form = inquiry.querySelector('[data-inquiry-form]');
  const status = inquiry.querySelector('[data-inquiry-status]');
  const submit = inquiry.querySelector('[data-inquiry-submit]');
  const mail = inquiry.querySelector('[data-inquiry-mail]');
  const date = form.querySelector('input[type="date"]');
  const contact = v.contact || {};

  const today = new Date();
  date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  document.addEventListener('tristac:inquiry', (e) => {
    detailsDialog.close();
    status.textContent = '';
    status.dataset.state = '';
    inquiryDialog.open(e.detail?.opener);
  });

  const setStatus = (text, state) => {
    status.textContent = text;
    status.dataset.state = state;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('[required]')];
    let firstInvalid = null;
    fields.forEach((f) => {
      const bad = !f.value.trim() || !f.checkValidity();
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !firstInvalid) firstInvalid = f;
    });
    if (firstInvalid) {
      setStatus('Popuni obavezna polja: ime, kontakt, željeni datum i svrhu iznajmljivanja.', 'error');
      firstInvalid.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.vozilo = v.name;

    if (contact.endpoint) {
      submit.disabled = true;
      setStatus('Slanje upita…', 'pending');
      try {
        const res = await fetch(contact.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          // _subject sets the email subject in Formspree-style form services.
          body: JSON.stringify({ ...data, _subject: `Upit — ${v.name}` })
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus('Upit je poslat. Vlasnik će te kontaktirati radi potvrde termina i cene. Ovo nije potvrda rezervacije.', 'success');
        form.reset();
      } catch {
        setStatus('Upit trenutno nije moguće poslati. Pokušaj ponovo kasnije ili nas kontaktiraj direktno.', 'error');
      } finally {
        submit.disabled = false;
      }
      return;
    }

    // No backend configured: be explicit, never pretend the inquiry was sent.
    if (contact.email) {
      const body = [
        `Ime: ${data.ime}`,
        `Kontakt: ${data.kontakt}`,
        `Željeni datum: ${data.datum}`,
        `Svrha: ${data.svrha}`,
        `Poruka: ${data.poruka || '—'}`
      ].join('\n');
      mail.href = `mailto:${contact.email}?subject=${encodeURIComponent(`Upit — ${v.name}`)}&body=${encodeURIComponent(body)}`;
      mail.hidden = false;
      setStatus('Online slanje još nije povezano. Upit možeš poslati e-poštom preko dugmeta ispod — podaci nisu prosleđeni.', 'info');
      return;
    }
    setStatus('Slanje upita još nije povezano sa serverom ili kontakt adresom. Vlasnik sajta treba da podesi odredište u konfiguraciji (contact.endpoint ili contact.email). Tvoji podaci nisu poslati.', 'info');
  });

  // Footer contact list and credits.
  const list = document.querySelector('[data-contact-list]');
  const rows = [
    { label: 'Lokacija', value: v.location || null },
    { label: 'Telefon', value: contact.phone, href: contact.phone ? `tel:${contact.phone.replace(/\s+/g, '')}` : null },
    {
      label: 'Instagram',
      value: contact.instagram || null,
      href: contact.instagram ? `https://www.instagram.com/${contact.instagram}/` : null,
      external: true,
      icon: 'instagram'
    }
  ];
  dlRows(list, rows.map((r) => ({ ...r, value: r.value ?? 'Uskoro' })));
  // Call buttons dial the configured number; they stay hidden without one.
  document.querySelectorAll('[data-call]').forEach((a) => {
    if (!contact.phone) return;
    a.href = `tel:${contact.phone.replace(/\s+/g, '')}`;
    a.dataset.phone = contact.phone;
    a.setAttribute('aria-label', `Pozovi ${contact.phone}`);
    a.hidden = false;
  });
  // Ask before dialling. iOS already shows its own call prompt, so it is skipped there.
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const number = a.dataset.phone || a.textContent;
      if (!ios && !window.confirm(`Da li želiš da pozoveš broj ${number}?`)) e.preventDefault();
    });
  });
  const credits = document.querySelector('[data-credits]');
  if (credits) {
    credits.hidden = true;
    onFallback(() => {
      credits.textContent = FALLBACK_CREDIT;
      credits.hidden = false;
    });
  }
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // Cards rise from the bottom in sequence; hidden cards are inert for keyboard users.
  const setInert = (on) => cards.forEach((c) => c.toggleAttribute('inert', on));

  const build = (beats) => {
    setInert(true);
    gsap.timeline({
      scrollTrigger: {
        start: beats.widgets[0],
        end: beats.widgets[1],
        scrub: true,
        onUpdate: (self) => setInert(self.progress < 0.5),
        onRefresh: (self) => setInert(self.progress < 0.5)
      }
    }).fromTo(cards,
      { yPercent: 70, autoAlpha: 0, ...blur(8) },
      { yPercent: 0, autoAlpha: 1, ...blur(0), ease: 'none', stagger: 0.18, duration: 0.6 });
  };

  const unlock = () => setInert(false);

  return { build, unlock, views };
}
