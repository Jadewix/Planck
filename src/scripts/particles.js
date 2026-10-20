const LOGO_PATH = 'M7721.43,4550h-42.1v.35l-.03-.06-202.62,105.47.32,1.51v18.7c-.05.6-.08,1.2-.08,1.82v129.95h42.79v-54.27h62.94l50.89,54.27h88.33l-.44-257.74ZM7679.08,4764.55h-25.66l-27.28-27.29-.12-.12-18.48-19.71c-3.94-4.2-9.38-6.62-15.11-6.75h-1.62s-71.1-.01-71.1-.01v-24.01l49.14-28.95,110.22-59.49v166.33Z';

/** Bounded hero-only particle rendering; idle offscreen and in background tabs. */
export function initParticles() {
  const canvas = document.querySelector('#service-particles');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hero = document.querySelector('.hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const path = new Path2D(LOGO_PATH);
  const points = [];
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Limit sampling attempts and particle count, including on lower-end phones.
  const count = innerWidth < 751 ? 1800 : 4200;
  for (let attempt = 0; points.length < count && attempt < count * 30; attempt++) {
    const x = 7476 + random() * 247;
    const y = 4549 + random() * 260;
    if (ctx.isPointInPath(path, x, y)) {
      points.push({ x: (x - 7599.5) / 125, y: (y - 4679) / 125, z: (random() - .5) * .64, noise: random() });
    }
  }
  let width = 0;
  let height = 0;
  let visible = false;
  let frame = 0;
  let elapsed = 0;
  let previous = 0;

  function paint(time) {
    frame = 0;
    const step = previous ? Math.min(time - previous, 50) : 0;
    previous = time;
    if (!reduced.matches) elapsed += step;
    ctx.clearRect(0, 0, width, height);
    const rect = hero.getBoundingClientRect();
    const progress = reduced.matches ? 0 : Math.max(0, Math.min(1, -rect.top / height));
    const angle = reduced.matches ? -.25 : elapsed * .00022 - .25;
    const cy = Math.cos(angle);
    const sy = Math.sin(angle);
    const scale = width < 751 ? Math.min(width * .29, 145) : Math.min(width * .14, height * .27);
    const ox = width < 751 ? width * .64 : width * .78;
    const oy = width < 751 ? height - 190 : height * .52;
    const spread = progress * progress;
    ctx.fillStyle = '#eadbff';
    ctx.globalAlpha = .9 * (1 - progress * .8);
    ctx.beginPath();
    points.forEach((p) => {
      const x = p.x * cy + p.z * sy;
      const z = -p.x * sy + p.z * cy;
      const perspective = 3.2 / (3.2 - z);
      const px = ox - x * scale * perspective + Math.sin(p.noise * 178) * spread * width * .35;
      const py = oy + p.y * scale * perspective + Math.cos(p.noise * 272) * spread * height * .35;
      const size = .7 + p.noise * .45;
      ctx.rect(px, py, size, size);
    });
    ctx.fill();
    ctx.globalAlpha = 1;
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(paint);
  }
  function start() {
    if (!visible || document.hidden || frame) return;
    previous = 0;
    frame = requestAnimationFrame(paint);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  new ResizeObserver(() => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    start();
  }).observe(hero);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  reduced.addEventListener('change', () => { stop(); start(); });
}
