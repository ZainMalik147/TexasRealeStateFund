/* Texas Real Estate Fund: UI interactions */
const EMAIL = 'info@texasrealestatefund.com'; // keep in sync with index.html

const body = document.body;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Analytics helper (GA4) ---------- */
function track(name, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

/* ---------- Loader ---------- */
let loaded = false;
function finishLoading() {
  if (loaded) return;
  loaded = true;
  body.classList.remove('is-loading');
  document.querySelector('.hero')?.classList.add('is-ready');
  revealHero();
}
const minDelay = reduceMotion ? 0 : 1700;
const start = performance.now();
window.addEventListener('load', () => setTimeout(finishLoading, Math.max(0, minDelay - (performance.now() - start))));
setTimeout(finishLoading, 4500); // safety net

function revealHero() {
  document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in'));
}

/* ---------- Header: scrolled / hide on scroll down ---------- */
const header = document.getElementById('header');
let lastY = window.scrollY;
function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 40);
  header.classList.toggle('is-hidden', y > 400 && y > lastY + 4 && !body.classList.contains('menu-open'));
  if (y < lastY - 4) header.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const menuBtn = document.getElementById('menu-btn');
function setMenu(open) {
  body.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

/* ---------- Active nav link ---------- */
const links = [...document.querySelectorAll('.nav__link')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

/* ---------- Card spotlight + subtle 3D tilt ---------- */
if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%');
      card.style.setProperty('--my', y * 100 + '%');
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ---------- Email click tracking ---------- */
document.querySelectorAll('.js-email').forEach((a) => {
  a.addEventListener('click', () => track('contact_email_click', { link_url: a.href, location: a.closest('footer') ? 'footer' : 'contact' }));
});

/* ---------- Contact form → mailto ---------- */
const form = document.getElementById('contact-form');
const err = document.getElementById('form-error');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const topic = form.topic.value;
  const msg = form.message.value.trim();
  if (!name || !msg) {
    err.textContent = 'Please add your name and a short message.';
    (name ? form.message : form.name).focus();
    return;
  }
  err.textContent = '';
  const subject = `${topic}: ${name}`;
  const text = `${msg}\n\n${name}`;
  track('contact_form_compose', { inquiry_type: topic });
  window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
});

/* ---------- 3D scenes (progressive enhancement) ---------- */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (webglAvailable()) {
  import('./scene.js')
    .then((m) => m.initCityScene(document.getElementById('scene-canvas'), { reduceMotion }))
    .then(() => document.querySelector('.scene').classList.add('is-ready'))
    .catch((e) => console.warn('City scene unavailable:', e));

  const emblem = document.querySelector('.emblem');
  const emblemIO = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    emblemIO.disconnect();
    import('./emblem.js')
      .then((m) => m.initEmblem(document.getElementById('emblem-canvas'), { reduceMotion }))
      .catch((e) => { console.warn('Emblem unavailable:', e); emblem.classList.add('no-webgl'); });
  }, { rootMargin: '300px' });
  emblemIO.observe(emblem);
} else {
  document.querySelector('.emblem')?.classList.add('no-webgl');
}
