/** One-time reveals and gently eased project motion; screenshots retain their framing. */
export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll('.services > h2, .service-list details, .work > h2, .case-screen, .case-copy, .about h2')];

  const reveals = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.remove('reveal-pending');
      reveals.unobserve(target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((target) => {
    if (reduced.matches || target.getBoundingClientRect().top < innerHeight) return;
    target.style.setProperty('--reveal-delay', target.matches('.case-copy') ? '120ms' : '0ms');
    target.classList.add('reveal', 'reveal-pending');
    reveals.observe(target);
  });

  const rows = [...document.querySelectorAll('.case-row')];
  const active = new Set();
  const positions = new WeakMap();
  let frame = 0;
  let previous = 0;

  function paint(time) {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const dt = previous ? Math.min(time - previous, 50) : 16;
    previous = time;
    const follow = 1 - Math.exp(-dt / 180);
    const narrow = innerWidth <= 750;
    let moving = false;
    const updates = [...active].map((row) => {
      const rect = row.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight));
      const target = progress * (narrow ? 14 : 36);
      const current = positions.get(row) ?? target;
      const next = Math.abs(target - current) < .05 ? target : current + (target - current) * follow;
      positions.set(row, next);
      if (Math.abs(target - next) >= .05) moving = true;
      return [row, next];
    });
    // Independent translate leaves the reveal transform and image geometry intact.
    updates.forEach(([row, offset]) => {
      row.querySelector('.case-screen').style.translate = `0 ${-offset}px`;
      row.querySelector('.case-copy').style.translate = `0 ${offset}px`;
    });
    if (moving) frame = requestAnimationFrame(paint);
    else previous = 0;
  }
  function request() {
    if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(paint);
  }
  const visibility = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) active.add(target);
      else active.delete(target);
    });
    request();
  }, { rootMargin: '100px' });
  rows.forEach((row) => visibility.observe(row));
  new ResizeObserver(request).observe(document.querySelector('main'));
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    request();
  });

  reduced.addEventListener('change', () => {
    if (!reduced.matches) { request(); return; }
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    targets.forEach((target) => {
      target.classList.remove('reveal-pending');
      target.style.removeProperty('translate');
    });
    reveals.disconnect();
  });
}
