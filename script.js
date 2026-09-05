// Genera la waveform superior una sola vez (determinista, no random en cada carga
// para que sea estable, pero con aspecto de audio real)
function buildWaveform() {
  const svg = document.getElementById('waveform-svg');
  const points = 220;
  const width = 1000;
  const height = 40;
  const mid = height / 2;

  let seed = 42;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  let d = `M 0 ${mid}`;
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const amp = (Math.sin(i * 0.35) * 0.5 + rand() * 0.7) * (mid * 0.85);
    d += ` L ${x.toFixed(1)} ${(mid + amp).toFixed(1)}`;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
}

// Mueve el playhead (línea roja) según el progreso de scroll de la página
function initPlayhead() {
  const playhead = document.getElementById('playhead');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    playhead.style.left = `${(progress * 100).toFixed(2)}%`;
  }

  update();
  if (reduceMotion) return;
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// Recuerda qué bloques (A/B/C) están abiertos mientras se navega por la pestaña
// (se resetea si se cierra el navegador, para que cada visita empiece limpia)
const ACCORDION_STORAGE_KEY = 'proyectos-bloques-abiertos';

function getOpenBlocksState() {
  try {
    return JSON.parse(sessionStorage.getItem(ACCORDION_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function setBlockOpenState(letter, isOpen) {
  try {
    const state = getOpenBlocksState();
    state[letter] = isOpen;
    sessionStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // sessionStorage no disponible (modo privado, etc.) — se ignora sin romper la web
  }
}

document.addEventListener('DOMContentLoaded', () => {
  buildWaveform();
  initPlayhead();
  initLightbox();
  initAccordions();
  initTrackToggles();
  initDeepLink();
});

// Deep-linking: si la URL trae un #ancla que apunta a una pieza dentro de un
// bloque colapsado (A/B/C), lo abre automáticamente y hace scroll hasta ella.
function initDeepLink() {
  function openTargetFromHash(animate) {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    let target;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return; // hash no válido como selector
    }
    if (!target) return;

    const list = target.closest('.track-list');
    if (!list) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const head = list.previousElementSibling;
    if (!head || !head.classList.contains('track-group-head')) return;

    // Si el ancla apunta a una pieza con contenido plegable (segundo nivel), abrirla también
    function openOwnDetail() {
      const detail = target.matches('.track-detail')
        ? target
        : target.querySelector(':scope > .track-detail') || target.closest('article.track')?.querySelector(':scope > .track-detail');
      if (!detail) return;
      const meta = detail.closest('article.track')?.querySelector('.track-meta');
      if (meta) meta.setAttribute('aria-expanded', 'true');
      detail.style.maxHeight = 'none';
    }

    function doScroll() {
      openOwnDetail();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (head.getAttribute('aria-expanded') === 'true') {
      doScroll();
      return;
    }

    head.setAttribute('aria-expanded', 'true');
    const letterEl = head.querySelector('.tc');
    if (letterEl) setBlockOpenState(letterEl.textContent.trim(), true);

    if (animate) {
      list.style.maxHeight = list.scrollHeight + 'px';
      list.addEventListener('transitionend', function onEnd() {
        list.style.maxHeight = 'none';
        list.removeEventListener('transitionend', onEnd);
        doScroll();
      });
    } else {
      // Carga inicial de la página: abrir sin animación y desplazar directamente
      list.style.maxHeight = 'none';
      doScroll();
    }
  }

  openTargetFromHash(false);
  window.addEventListener('hashchange', () => openTargetFromHash(true));
}

// Desplegables de segundo nivel: cada pieza (A1, A2...) se colapsa a su fila
// de título; se expande al hacer clic en la fila o activar el código con teclado.
function initTrackToggles() {
  document.querySelectorAll('.track-detail').forEach(detail => {
    const article = detail.closest('article.track');
    if (!article) return;
    const meta = article.querySelector('.track-meta');
    if (!meta) return;

    article.classList.add('has-detail');
    meta.setAttribute('role', 'button');
    meta.setAttribute('tabindex', '0');
    meta.setAttribute('aria-expanded', 'false');

    const icon = document.createElement('span');
    icon.className = 'track-toggle-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▾';
    meta.appendChild(icon);

    function toggle() {
      const isOpen = meta.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        detail.style.maxHeight = detail.scrollHeight + 'px';
        requestAnimationFrame(() => { detail.style.maxHeight = '0px'; });
        meta.setAttribute('aria-expanded', 'false');
      } else {
        meta.setAttribute('aria-expanded', 'true');
        detail.style.maxHeight = detail.scrollHeight + 'px';
        detail.addEventListener('transitionend', function onEnd() {
          if (meta.getAttribute('aria-expanded') === 'true') {
            detail.style.maxHeight = 'none';
          }
          detail.removeEventListener('transitionend', onEnd);
        });
      }
    }

    article.addEventListener('click', (e) => {
      // Permitir que clics dentro del contenido (audio, vídeo, imágenes, enlaces) funcionen con normalidad
      if (e.target.closest('.track-detail')) return;
      if (detail.style.maxHeight === 'none') {
        detail.style.maxHeight = detail.scrollHeight + 'px';
        requestAnimationFrame(() => { detail.style.maxHeight = '0px'; });
        meta.setAttribute('aria-expanded', 'false');
        return;
      }
      toggle();
    });

    meta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        article.click();
      }
    });

    // Enlace para contraer desde el final de la pieza, sin tener que volver arriba
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'collapse-footer';
    collapseBtn.innerHTML = '<span aria-hidden="true">▴</span> Contraer';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
      meta.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    detail.appendChild(collapseBtn);
  });
}
// Desplegables de bloque (A/B/C): colapsados por defecto, se expanden al hacer clic.
// Recuerda el estado abierto/cerrado durante la sesión de navegación.
function initAccordions() {
  const savedState = getOpenBlocksState();

  document.querySelectorAll('.track-group-head').forEach(head => {
    const list = head.nextElementSibling;
    if (!list || !list.classList.contains('track-list')) return;

    const letterEl = head.querySelector('.tc');
    const letter = letterEl ? letterEl.textContent.trim() : null;

    // Contador de subapartados junto al título
    const count = list.querySelectorAll(':scope > article.track').length;
    const h3 = head.querySelector('h3');
    if (h3 && count) {
      const span = document.createElement('span');
      span.className = 'item-count';
      span.textContent = `(${count})`;
      h3.insertAdjacentElement('afterend', span);
    }

    // Restaurar estado guardado de esta sesión de navegación (sin animación)
    if (letter && savedState[letter]) {
      head.setAttribute('aria-expanded', 'true');
      list.style.maxHeight = 'none';
    }

    function toggle() {
      const isOpen = head.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        list.style.maxHeight = list.scrollHeight + 'px';
        requestAnimationFrame(() => { list.style.maxHeight = '0px'; });
        head.setAttribute('aria-expanded', 'false');
        if (letter) setBlockOpenState(letter, false);
      } else {
        head.setAttribute('aria-expanded', 'true');
        list.style.maxHeight = list.scrollHeight + 'px';
        // tras la transición, permitir crecer libremente si el contenido cambia (imágenes cargando)
        list.addEventListener('transitionend', function onEnd() {
          if (head.getAttribute('aria-expanded') === 'true') {
            list.style.maxHeight = 'none';
          }
          list.removeEventListener('transitionend', onEnd);
        });
        if (letter) setBlockOpenState(letter, true);
      }
    }

    head.addEventListener('click', () => {
      // si estaba en 'none' (totalmente abierto), fijar altura actual antes de colapsar
      if (list.style.maxHeight === 'none') {
        list.style.maxHeight = list.scrollHeight + 'px';
        requestAnimationFrame(() => { list.style.maxHeight = '0px'; });
        head.setAttribute('aria-expanded', 'false');
        if (letter) setBlockOpenState(letter, false);
        return;
      }
      toggle();
    });

    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        head.click();
      }
    });

    // Enlace para contraer desde el final del bloque, sin tener que volver arriba
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'collapse-footer collapse-footer--block';
    collapseBtn.innerHTML = '<span aria-hidden="true">▴</span> Contraer bloque';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
      head.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    list.appendChild(collapseBtn);
  });
}

// Lightbox: clic (o Enter/Espacio con teclado) en imágenes .composition-cover
// las abre en grande. Si la miniatura tiene data-video, abre un vídeo en su lugar.
// Cuando la imagen pertenece a una galería (.gallery-row), aparecen flechas
// izquierda/derecha para pasar a la siguiente foto sin cerrar el lightbox.
// Mientras está abierto, el foco queda atrapado dentro y se devuelve a la
// miniatura de origen al cerrar.
function initLightbox() {
  const overlay = document.getElementById('lightbox');
  const overlayImg = document.getElementById('lightbox-img');
  const overlayVideo = document.getElementById('lightbox-video');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');
  if (!overlay || !overlayImg || !overlayVideo || !closeBtn) return;

  let lastFocused = null;
  let currentGroup = [];   // elementos navegables del mismo gallery-row
  let currentIndex = -1;

  function showAt(index) {
    if (!currentGroup.length) return;
    currentIndex = (index + currentGroup.length) % currentGroup.length;
    const el = currentGroup[currentIndex];
    const videoSrc = el.dataset.video;
    if (videoSrc) {
      overlayImg.style.display = 'none';
      overlayVideo.style.display = 'block';
      overlayVideo.src = videoSrc;
      overlayVideo.load();
      const tryPlay = () => {
        overlayVideo.removeEventListener('canplay', tryPlay);
        overlayVideo.play().catch(() => {});
      };
      overlayVideo.addEventListener('canplay', tryPlay);
    } else {
      overlayVideo.pause();
      overlayVideo.style.display = 'none';
      overlayImg.style.display = 'block';
      overlayImg.src = el.dataset.full || el.src;
      overlayImg.alt = el.alt;
    }
  }

  function open(el) {
    lastFocused = el;
    const group = !el.dataset.video ? el.closest('.gallery-row') : null;
    if (group) {
      currentGroup = Array.from(group.querySelectorAll('.composition-cover')).filter(item => !item.dataset.video);
      overlay.classList.add('has-nav', 'fit-tall');
    } else {
      currentGroup = [el];
      overlay.classList.remove('has-nav');
      overlay.classList.toggle('fit-tall', el.dataset.fitTall === 'true');
    }
    overlay.classList.add('active');
    showAt(currentGroup.indexOf(el));
    closeBtn.focus();
    document.addEventListener('keydown', trapFocus);
  }

  function close() {
    overlay.classList.remove('active', 'has-nav', 'fit-tall');
    overlayImg.src = '';
    overlayVideo.pause();
    overlayVideo.src = '';
    currentGroup = [];
    currentIndex = -1;
    document.removeEventListener('keydown', trapFocus);
    if (lastFocused) lastFocused.focus();
  }

  function getFocusableInOverlay() {
    return Array.from(overlay.querySelectorAll('button, video, [tabindex]:not([tabindex="-1"])'))
      .filter(elm => elm.offsetParent !== null); // solo los visibles
  }

  function trapFocus(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowLeft' && currentGroup.length > 1) {
      e.preventDefault();
      showAt(currentIndex - 1);
      return;
    }
    if (e.key === 'ArrowRight' && currentGroup.length > 1) {
      e.preventDefault();
      showAt(currentIndex + 1);
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = getFocusableInOverlay();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.querySelectorAll('.composition-cover').forEach(el => {
    // Hacer las miniaturas accesibles por teclado
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    const action = el.dataset.video ? 'Reproducir vídeo' : 'Ampliar imagen';
    el.setAttribute('aria-label', `${action}: ${el.alt || ''}`);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      open(el);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(el);
      }
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showAt(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showAt(currentIndex + 1); });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);
}
