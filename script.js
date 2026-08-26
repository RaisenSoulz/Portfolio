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

document.addEventListener('DOMContentLoaded', () => {
  buildWaveform();
  initPlayhead();
  initLightbox();
  initAccordions();
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

    function doScroll() {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (head.getAttribute('aria-expanded') === 'true') {
      doScroll();
      return;
    }

    head.setAttribute('aria-expanded', 'true');
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

// Desplegables de bloque (A/B/C): colapsados por defecto, se expanden al hacer clic
function initAccordions() {
  document.querySelectorAll('.track-group-head').forEach(head => {
    const list = head.nextElementSibling;
    if (!list || !list.classList.contains('track-list')) return;

    // Contador de subapartados junto al título
    const count = list.querySelectorAll(':scope > article.track').length;
    const h3 = head.querySelector('h3');
    if (h3 && count) {
      const span = document.createElement('span');
      span.className = 'item-count';
      span.textContent = `(${count})`;
      h3.insertAdjacentElement('afterend', span);
    }

    function toggle() {
      const isOpen = head.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        list.style.maxHeight = list.scrollHeight + 'px';
        requestAnimationFrame(() => { list.style.maxHeight = '0px'; });
        head.setAttribute('aria-expanded', 'false');
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
      }
    }

    head.addEventListener('click', () => {
      // si estaba en 'none' (totalmente abierto), fijar altura actual antes de colapsar
      if (list.style.maxHeight === 'none') {
        list.style.maxHeight = list.scrollHeight + 'px';
        requestAnimationFrame(() => { list.style.maxHeight = '0px'; });
        head.setAttribute('aria-expanded', 'false');
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
  });
}

// Lightbox: clic en imágenes .composition-cover las abre en grande.
// Si la miniatura tiene data-video, abre un reproductor de vídeo en su lugar.
function initLightbox() {
  const overlay = document.getElementById('lightbox');
  const overlayImg = document.getElementById('lightbox-img');
  const overlayVideo = document.getElementById('lightbox-video');
  if (!overlay || !overlayImg || !overlayVideo) return;

  document.querySelectorAll('.composition-cover').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const videoSrc = el.dataset.video;
      if (videoSrc) {
        overlayImg.style.display = 'none';
        overlayVideo.style.display = 'block';
        overlayVideo.src = videoSrc;
        overlay.classList.add('active');
        overlayVideo.play().catch(() => {});
      } else {
        overlayVideo.style.display = 'none';
        overlayImg.style.display = 'block';
        overlayImg.src = el.src;
        overlayImg.alt = el.alt;
        overlay.classList.add('active');
      }
    });
  });

  function close() {
    overlay.classList.remove('active');
    overlayImg.src = '';
    overlayVideo.pause();
    overlayVideo.src = '';
  }
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}
