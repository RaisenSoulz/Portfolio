/* ==========================================================
   D.E.F. Portfolio V2
   Interacción ligera, accesible y sin dependencias externas.
   ========================================================== */

function buildWaveform() {
  const svg = document.getElementById('waveform-svg');
  if (!svg) return;
  const points = 240;
  const width = 1000;
  const height = 40;
  const mid = height / 2;
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let d = `M 0 ${mid}`;
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const amp = (Math.sin(i * 0.34) * 0.45 + rand() * 0.7) * (mid * 0.82);
    d += ` L ${x.toFixed(1)} ${(mid + amp).toFixed(1)}`;
  }
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
}

function initPlayhead() {
  const playhead = document.getElementById('playhead');
  if (!playhead) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    playhead.style.left = `${(progress * 100).toFixed(2)}%`;
  };
  update();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;
  const close = () => {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  };
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 800) close(); });
}

function initSingleMediaPlayback() {
  const media = Array.from(document.querySelectorAll('audio, video'));
  media.forEach(el => el.addEventListener('play', () => {
    media.forEach(other => { if (other !== el && !other.paused) other.pause(); });
  }));
}

function initFilters() {
  const buttons = document.querySelectorAll('.filter-button');
  const cards = document.querySelectorAll('.archive-card');
  if (!buttons.length || !cards.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      buttons.forEach(b => b.classList.toggle('is-active', b === button));
      cards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });
}

function initLightbox() {
  const overlay = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const video = document.getElementById('lightbox-video');
  const caption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');
  if (!overlay || !img || !video || !closeBtn) return;

  let group = [];
  let index = -1;
  let lastFocused = null;

  const isImage = el => Boolean(el.dataset.full) && !el.dataset.video;
  const getLabel = el => el.querySelector('img')?.alt || el.getAttribute('aria-label') || '';

  function show(el) {
    if (!el) return;
    const videoSrc = el.dataset.video;
    if (videoSrc) {
      img.style.display = 'none';
      video.style.display = 'block';
      video.src = videoSrc;
      video.load();
      video.play().catch(() => {});
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.style.display = 'none';
      img.style.display = 'block';
      img.src = el.dataset.full || el.querySelector('img')?.src || '';
      img.alt = getLabel(el);
    }
    caption.textContent = getLabel(el);
  }

  function open(el, items = [el]) {
    lastFocused = el;
    group = items.filter(Boolean);
    index = Math.max(0, group.indexOf(el));
    overlay.classList.toggle('has-nav', group.length > 1);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    show(group[index]);
    closeBtn.focus();
  }

  function close() {
    overlay.classList.remove('active', 'has-nav');
    overlay.setAttribute('aria-hidden', 'true');
    img.src = '';
    video.pause();
    video.removeAttribute('src');
    video.load();
    document.body.classList.remove('is-locked');
    if (lastFocused) lastFocused.focus();
    group = [];
    index = -1;
  }

  function move(delta) {
    if (group.length < 2) return;
    index = (index + delta + group.length) % group.length;
    show(group[index]);
  }

  document.querySelectorAll('.media-trigger').forEach(el => {
    el.addEventListener('click', () => open(el));
  });

  document.querySelectorAll('[data-gallery]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = el.dataset.gallery;
      const source = document.getElementById(id);
      if (source) {
        const items = Array.from(source.querySelectorAll('img')).map(sourceImg => ({
          dataset: { full: sourceImg.src },
          querySelector: () => sourceImg,
          getAttribute: () => null
        }));
        const start = Math.min(0, items.length - 1);
        open(items[start], items);
      } else {
        const groupName = el.dataset.gallery;
        const items = Array.from(document.querySelectorAll(`[data-gallery="${groupName}"]`));
        open(el, items);
      }
    });
  });

  // Para los botones de vídeo que también actúan como enlaces de texto.
  document.querySelectorAll('.text-button[data-video]').forEach(el => {
    el.addEventListener('click', () => open(el, [el]));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => move(-1));
  nextBtn.addEventListener('click', () => move(1));
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });
}

function initGalleryButtons() {
  document.querySelectorAll('.gallery-cover[data-gallery]').forEach(button => {
    button.addEventListener('click', () => {
      const name = button.dataset.gallery;
      const items = Array.from(document.querySelectorAll(`.gallery-cover[data-gallery="${name}"]`));
      const event = new CustomEvent('portfolio-open-gallery', { detail: { element: button, items } });
      document.dispatchEvent(event);
    });
  });
}

// Galerías visibles: abre directamente todos los botones con el mismo data-gallery.
function initGalleryBridge() {
  document.addEventListener('portfolio-open-gallery', e => {
    const { element, items } = e.detail;
    const overlay = document.getElementById('lightbox');
    if (!overlay) return;
    const img = document.getElementById('lightbox-img');
    const video = document.getElementById('lightbox-video');
    const caption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close-btn');
    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');
    let index = Math.max(0, items.indexOf(element));
    const show = () => {
      const current = items[index];
      video.pause(); video.removeAttribute('src'); video.load(); video.style.display = 'none';
      img.style.display = 'block'; img.src = current.dataset.full || current.querySelector('img')?.src || ''; img.alt = current.querySelector('img')?.alt || '';
      caption.textContent = img.alt;
    };
    const move = delta => { index = (index + delta + items.length) % items.length; show(); };
    const keyHandler = ev => {
      if (!overlay.classList.contains('active')) return;
      if (ev.key === 'Escape') close();
      if (ev.key === 'ArrowLeft' && items.length > 1) move(-1);
      if (ev.key === 'ArrowRight' && items.length > 1) move(1);
    };
    const close = () => {
      overlay.classList.remove('active', 'has-nav'); overlay.setAttribute('aria-hidden', 'true');
      img.src = ''; document.body.classList.remove('is-locked'); document.removeEventListener('keydown', keyHandler); element.focus();
    };
    overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false'); overlay.classList.toggle('has-nav', items.length > 1); document.body.classList.add('is-locked');
    show(); closeBtn.focus();
    const oldClose = closeBtn.cloneNode(true); closeBtn.replaceWith(oldClose); oldClose.addEventListener('click', close);
    const oldPrev = prevBtn.cloneNode(true); prevBtn.replaceWith(oldPrev); oldPrev.addEventListener('click', () => move(-1));
    const oldNext = nextBtn.cloneNode(true); nextBtn.replaceWith(oldNext); oldNext.addEventListener('click', () => move(1));
    overlay.onclick = ev => { if (ev.target === overlay) close(); };
    document.addEventListener('keydown', keyHandler);
  });
}

function init() {
  buildWaveform();
  initPlayhead();
  initMobileNav();
  initSingleMediaPlayback();
  initFilters();
  initLightbox();
  initGalleryButtons();
  initGalleryBridge();
}

document.addEventListener('DOMContentLoaded', init);
