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
});
