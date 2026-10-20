/** One-time reveals and gently eased project motion; screenshots retain their framing. */
export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stars = document.createElement('div');
  stars.className = 'atmosphere-stars';
  const starFragment = document.createDocumentFragment();
  for (let index = 0; index < 118; index++) {
    const star = document.createElement('i');
    star.className = 'atmosphere-star';
    // Four widely separated glow accents; all other stars remain faint pinpoints.
    if (index < 4) {
      star.classList.add('star-glow');
      star.style.left = `${[14, 76, 33, 88][index]}%`;
      star.style.top = `${[18, 30, 76, 88][index]}%`;
    }
    if (index >= 4) star.style.left = `${(index * 61.8034) % 100}%`;
    if (index >= 4) star.style.top = `${(index * 37.719 + 13) % 100}%`;
    star.style.setProperty('--star-size', `${index >= 78 ? .5 : index % 7 === 0 ? 1.3 : .9}px`);
    star.style.setProperty('--star-duration', `${2.5 + index % 5}s`);
    star.style.setProperty('--star-delay', `${-(index % 11) * .7}s`);
    starFragment.append(star);
  }
  stars.append(starFragment);
  document.querySelector('.atmosphere').append(stars);
  // Keep the original heading markup and accessible text; only wrap individual words.
  const titles = [...document.querySelectorAll('.hero h1, .services > h2, .work > h2, .about h2, .contact h2')];
  const titleAnimations = new Set();
  const titleReveals = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      titleReveals.unobserve(target);
      if (reduced.matches) return;
      target.querySelectorAll('.title-word').forEach((word, index) => {
        const animation = word.animate([
          { opacity: 0, transform: 'translateY(.4em)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], {
          duration: 550,
          delay: Math.min(index * 30, 150),
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'backwards',
        });
        titleAnimations.add(animation);
        animation.onfinish = () => titleAnimations.delete(animation);
      });
    });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

  titles.forEach((title) => {
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) fragment.append(document.createTextNode(part));
        else {
          const word = document.createElement('span');
          word.className = 'title-word';
          word.textContent = part;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    titleReveals.observe(title);
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    titleAnimations.forEach((animation) => animation.cancel());
    titleAnimations.clear();
    document.querySelector('.service-list')?.classList.remove('service-focused');
    titleReveals.disconnect();
  });
  const targets = [...document.querySelectorAll('.service-list details, .case-screen, .case-copy')];

  const reveals = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.remove('reveal-pending');
      reveals.unobserve(target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((target) => {
    if (reduced.matches || target.getBoundingClientRect().top < innerHeight) return;
    const stepIndex = target.matches('.project-process li') ? [...target.parentElement.children].indexOf(target) : -1;
    const delay = stepIndex >= 0 ? `${stepIndex * 150}ms` : target.matches('.case-copy') ? '70ms' : '0ms';
    target.style.setProperty('--reveal-delay', delay);
    target.classList.add('reveal', 'reveal-pending');
    reveals.observe(target);
  });

  // Trigger each step from its own viewport bounds, including direct About links.
  const steps = [...document.querySelectorAll('.project-process > li')];
  const stepAnimations = new Set();
  const visibleSteps = new WeakSet();
  const processReveal = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) { visibleSteps.delete(target); return; }
      if (visibleSteps.has(target)) return;
      visibleSteps.add(target);
      if (reduced.matches) return;
      const index = steps.indexOf(target);
      const animation = target.animate([
        { opacity: 0, transform: 'translateY(44px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], {
        duration: 800,
        delay: innerWidth > 750 ? index * 450 : 80,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'backwards',
      });
      stepAnimations.add(animation);
      animation.onfinish = () => stepAnimations.delete(animation);
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  steps.forEach((step) => processReveal.observe(step));
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    stepAnimations.forEach((animation) => animation.cancel());
    stepAnimations.clear();
    processReveal.disconnect();
  });
  const serviceList = document.querySelector('.service-list');
  const services = [...serviceList.querySelectorAll('details')];
  let hoveredService = null;
  function highlightService(row) {
    services.forEach((service) => service.classList.toggle('service-active', service === row));
    serviceList.classList.toggle('service-focused', Boolean(row));
  }
  services.forEach((service) => {
    const summary = service.querySelector('summary');
    const text = [...summary.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (text) {
      const label = text.textContent.trim();
      summary.setAttribute('aria-label', label);
      const title = document.createElement('span');
      title.className = 'service-title';
      title.setAttribute('aria-hidden', 'true');
      label.split(/(\s+)/).forEach((word) => {
        if (/^\s+$/.test(word)) { title.append(document.createTextNode(word)); return; }
        const wrap = document.createElement('span');
        wrap.className = 'service-word';
        [...word].forEach((letter, index) => {
          const char = document.createElement('span');
          char.className = 'service-char';
          char.textContent = letter;
          char.style.setProperty('--char-delay', `${index * 28}ms`);
          wrap.append(char);
        });
        title.append(wrap);
      });
      text.replaceWith(title);
    }
    service.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      service.open = true;
      hoveredService = service;
      highlightService(service);
    });
    service.addEventListener('pointerleave', () => {
      hoveredService = null;
      if (!service.contains(document.activeElement)) service.open = false;
      request();
    });
    summary.addEventListener('click', (event) => {
      if (hoveredService === service && service.open) event.preventDefault();
    });
    service.addEventListener('focusin', () => highlightService(service));
    service.addEventListener('focusout', request);
  });
  const depthLayers = [
    // Move section labels and supporting copy with the heading; keep project motion as before.
    ...[...document.querySelectorAll('.hero-eyebrow, .hero h1, .hero > p, .hero > .text-link, .services > .section-label, .services > h2, .about > .section-label, .about > h2, .about > .about-copy, .about > .project-process, .contact > .section-label, .contact > h2, .contact > p')]
      .map((element) => ({ element, section: element.closest('section'), kind: 'title', value: 0 })),
    ...[...document.querySelectorAll('.atmosphere-glow, .atmosphere-dust')]
      .map((element, index) => ({ element, kind: 'background', speed: [100, 65][index], value: 0 })),
    ...[...document.querySelectorAll('.hero-particles')]
      .map((element) => ({ element, kind: 'particles', value: 0 })),
  ];
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
    const follow = 1 - Math.exp(-dt / 75);
    const narrow = innerWidth <= 750;
    if (!hoveredService && !serviceList.contains(document.activeElement)) {
      const visibleServices = services.map((service) => ({ service, rect: service.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > 100 && rect.top < innerHeight * .85);
      visibleServices.sort((a, b) => Math.abs(a.rect.top + a.rect.height / 2 - innerHeight * .5) - Math.abs(b.rect.top + b.rect.height / 2 - innerHeight * .5));
      highlightService(visibleServices[0]?.service);
    }
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
    // Measure section anchors so translated headings never feed back into their own motion.
    const pageProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    const depthUpdates = depthLayers.map((layer) => {
      let target;
      if (layer.kind === 'title') {
        const progress = Math.max(-1, Math.min(1, -layer.section.getBoundingClientRect().top / innerHeight));
        const about = layer.section.matches('.about');
        target = -progress * (about ? (narrow ? 36 : 85) : (narrow ? 18 : 40));
      } else if (layer.kind === 'particles') {
        target = Math.min(scrollY * (narrow ? .07 : .12), narrow ? 45 : 90);
      } else target = pageProgress * layer.speed * (narrow ? .6 : 1);
      const next = Math.abs(target - layer.value) < .05 ? target : layer.value + (target - layer.value) * follow;
      layer.value = next;
      if (Math.abs(target - next) >= .05) moving = true;
      return [layer.element, next];
    });
    depthUpdates.forEach(([element, offset]) => { element.style.translate = `0 ${offset}px`; });
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
    depthLayers.forEach((layer) => { layer.element.style.removeProperty('translate'); layer.value = 0; });
    reveals.disconnect();
  });
}
