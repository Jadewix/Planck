/** One-way reveals and scroll-linked previews, with no competing scroll writers. */
export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll('.services > h2, .service-list details, .work > h2, .case-copy, .about h2')];
  const screens = [...document.querySelectorAll('.case-screen')];
  const active = new Set();
  let frame = 0;

  function paint() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    // All geometry reads precede style writes to avoid layout thrashing.
    const updates = [...active].map((screen) => {
      const rect = screen.getBoundingClientRect();
      const image = screen.querySelector('img');
      const travel = Math.max(0, image.clientHeight - screen.clientHeight);
      const progress = Math.max(0, Math.min(1, (innerHeight * .85 - rect.top) / (innerHeight * .7 + rect.height * .4)));
      return [screen, -travel * progress];
    });
    updates.forEach(([screen, offset]) => screen.style.setProperty('--preview-offset', `${offset}px`));
  }
  function request() {
    if (!frame && !reduced.matches) frame = requestAnimationFrame(paint);
  }

  const reveals = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.remove('reveal-pending');
      reveals.unobserve(target); // Revealed content never disappears when scrolling back.
    });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((target, index) => {
    if (reduced.matches || target.getBoundingClientRect().top < innerHeight) return;
    target.style.setProperty('--reveal-delay', `${(index % 3) * 70}ms`);
    target.classList.add('reveal', 'reveal-pending');
    reveals.observe(target);
  });

  const visibility = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) active.add(target);
      else active.delete(target);
    });
    request();
  }, { rootMargin: '100px' });
  screens.forEach((screen) => {
    visibility.observe(screen);
    screen.querySelector('img').addEventListener('load', request);
  });
  const size = new ResizeObserver(request);
  screens.forEach((screen) => size.observe(screen));
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  document.addEventListener('visibilitychange', request);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      targets.forEach((target) => target.classList.remove('reveal-pending'));
      reveals.disconnect();
      screens.forEach((screen) => screen.style.removeProperty('--preview-offset'));
    } else request();
  });
}
