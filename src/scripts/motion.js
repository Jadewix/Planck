/** Reveal each section once; project captures stay still and readable. */
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

  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    targets.forEach((target) => target.classList.remove('reveal-pending'));
    reveals.disconnect();
  });
}
