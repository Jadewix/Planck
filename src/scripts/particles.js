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
  const count = innerWidth < 751 ? 3200 : 4800;
  for (let attempt = 0; points.length < count && attempt < count * 30; attempt++) {
    const x = 7476 + random() * 247;
    const y = 4549 + random() * 260;
    if (ctx.isPointInPath(path, x, y)) {
      const face = random();
      const z = face < .38 ? .32 : face < .76 ? -.32 : (random() - .5) * .64;
      const noise = random();
      points.push({
        x: (x - 7599.5) / 125,
        y: (y - 4679) / 125,
        z,
        driftX: Math.sin(noise * 178),
        driftY: Math.cos(noise * 272),
        size: .7 + noise * .45,
      });
    }
  }
  // Restore the export's defined silhouette and extruded edges, with bounded sampling.
  const edgeCount = innerWidth < 751 ? 1800 : 2800;
  for (let added = 0, attempt = 0; added < edgeCount && attempt < edgeCount * 70; attempt++) {
    const x = 7476 + random() * 247;
    const y = 4549 + random() * 260;
    if (!ctx.isPointInPath(path, x, y)) continue;
    const nearEdge = !ctx.isPointInPath(path, x + 1.8, y)
      || !ctx.isPointInPath(path, x - 1.8, y)
      || !ctx.isPointInPath(path, x, y + 1.8)
      || !ctx.isPointInPath(path, x, y - 1.8);
    if (!nearEdge) continue;
    const noise = random();
    points.push({ x: (x - 7599.5) / 125, y: (y - 4679) / 125,
      z: (random() - .5) * .64, driftX: Math.sin(noise * 178),
      driftY: Math.cos(noise * 272), size: .7 + noise * .45 });
    added++;
  }
  let width = 0;
  let height = 0;
  let heroHeight = 0;
  let textCenter = 0;
  const headline = hero.querySelector('h1');
  const subtitle = hero.querySelector(':scope > p');
  let visible = false;
  let frame = 0;
  let elapsed = 0;
  let previous = 0;
  let easedProgress = 0;
  let syncProgress = true;

  function paint(time) {
    frame = 0;
    const step = previous ? Math.min(time - previous, 50) : 0;
    previous = time;
    if (!reduced.matches) elapsed += step;
    ctx.clearRect(0, 0, width, height);
    const rect = hero.getBoundingClientRect();
    const targetProgress = Math.max(0, Math.min(1, -rect.top / (heroHeight * 1.25)));
    // Reach the full spread earlier, while smoothing wheel and touch input over time.
    easedProgress = reduced.matches ? 0 : syncProgress ? targetProgress : easedProgress + (targetProgress - easedProgress) * (1 - Math.exp(-step / 160));
    syncProgress = false;
    const progress = easedProgress;
    // Keep the logo readable instead of flattening edge-on during a full turn.
    const angle = reduced.matches ? -.25 : -.25 + Math.sin(elapsed * .00014) * .38;
    const tilt = reduced.matches ? -.1 : Math.sin(elapsed * .00021) * .18 - .1;
    const roll = reduced.matches ? 0 : Math.sin(elapsed * .00017) * .055;
    const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
    const cosRoll = Math.cos(roll), sinRoll = Math.sin(roll);
    const cy = Math.cos(angle);
    const sy = Math.sin(angle);
    const scale = width < 751 ? Math.min(width * .29, 145) : Math.min(width * .18, heroHeight * .33);
    const ox = width < 751 ? width * .64 : width * .78;
    const oy = width < 751 ? heroHeight - 190 : textCenter;
    // Smoothstep starts gently and settles without an abrupt stop at full spread.
    const spread = progress * progress * (3 - 2 * progress);
    ctx.fillStyle = '#efdef9';
    ctx.globalAlpha = .9 * (1 - progress * .65);
    ctx.beginPath();
    for (const p of points) {
      const x = p.x * cy + p.z * sy;
      const z = -p.x * sy + p.z * cy;
      const perspective = 3.2 / (3.2 - z);
      const y = p.y * cosTilt - z * sinTilt;
      const rx = x * cosRoll - y * sinRoll;
      const ry = x * sinRoll + y * cosRoll;
      const px = ox - rx * scale * perspective + p.driftX * spread * width * .35;
      const py = oy + ry * scale * perspective + (p.driftY * .3 + .55) * spread * heroHeight;
      ctx.rect(px, py, p.size, p.size);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(paint);
  }
  function start() {
    if (!visible || document.hidden || frame) return;
    previous = 0;
    syncProgress = true;
    frame = requestAnimationFrame(paint);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function resize() {
    const nextWidth = hero.clientWidth;
    const nextHeight = canvas.clientHeight;
    const nextHeroHeight = hero.clientHeight;
    if (!nextWidth || !nextHeight || !nextHeroHeight) return;
    // Layout coordinates exclude animated text transforms, avoiding positional jitter.
    const nextCenter = (headline.offsetTop + subtitle.offsetTop + subtitle.offsetHeight) / 2;
    const layoutChanged = width !== nextWidth || height !== nextHeight || heroHeight !== nextHeroHeight || textCenter !== nextCenter;
    width = nextWidth;
    height = nextHeight;
    heroHeight = nextHeroHeight;
    textCenter = nextCenter;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const bufferWidth = Math.round(width * ratio);
    const bufferHeight = Math.round(height * ratio);
    const bufferChanged = canvas.width !== bufferWidth || canvas.height !== bufferHeight;
    // Setting a canvas dimension clears it even when its value has not changed.
    if (bufferChanged) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    if (layoutChanged || bufferChanged) start();
  }
  const sizing = new ResizeObserver(resize);
  sizing.observe(hero);
  sizing.observe(canvas);
  addEventListener('resize', resize, { passive: true });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  reduced.addEventListener('change', () => { stop(); start(); });
}
